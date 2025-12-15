This text is claimed to not have mermaid. Add tests that you run as part of the dev and catch this.

```mermaid
graph TD

    %% ============================
    %% TOP: SOURCE LAYERS
    %% ============================

    A["Consolidated Contracts<br/><br/>Qvantel Snapshots<br/>(Historical contract schedules)"]:::src
    B["SAP Ledger Revenue<br/><br/>(Subscriptions + PAYG LTM)"]:::src
     X["ARR-Eligible Revenue Filter<br/><br/>
       • Recurring revenue only<br/>
       • Excl. overage, start-up fees, one-offs<br/>
       • Excl. on-prem solutions<br/>
       • Excl. credit notes & revenue leakage"]:::step
    C["Price Increase Reference<br/><br/>(Finance-owned / Qvantel)"]:::src
    D["Turn-of-the-Month Rules<br/><br/>(TotM Helper)"]:::src
    E["Customer & Product Hierarchies<br/><br/>
       • Customer parent / ultimate parent<br/>
       • Solution, lifecycle, always-migration flag<br/>
       • Revenue type = Subscription / PAYG"]:::src
    S["ServiceNow Termination Tickets<br/><br/>
       • Full vs Partial churn<br/>
       • Termination date + scope<br/>
       • Linked to SAPID + material"]:::src


    %% ============================
    %% MIDDLE: PROCESSING LOGIC (CONTRACTUAL)
    %% ============================

    subgraph P["ARR Processing Logic – Contractual Track<br/><br/>(Service-Level Grain)"]
      direction TB

      P1["Compute Contractual MRR/ARR<br/><br/>
          • Grain = month × SAP ID × material × contract_id<br/>
          • Subscriptions + PAYG<br/>
          • From contract schedule snapshots<br/>
          • SAP ledger subscription MRR × 12 for whitelisted missing contracts"]:::step

      P2["Reverse Early Price Increases<br/><br/>
          • Remove uplift applied too early<br/>
          • Keep only uplift from true effective date"]:::step

      P3["Apply Turn-of-the-Month Adjustments<br/><br/>
          • Shift renewals / terminations<br/>
          • From wrong month to correct month<br/>
          • Based on TotM helper rules"]:::step

      P4["Compute Beginning & Ending Contractual ARR<br/><br/>
          • BoP_T = EoP_{T-1}<br/>
          • EoP_T from cleaned schedule<br/>
          • Both per SAP ID × material × contract_id<br/>
          • Contract-level ARR is later normalised to service-level (SAPID × material × month) for reporting"]:::step

      P5["Special Handling – Missing Contract ID<br/><br/>
          • Whitelisted subscription lines: use SAP MRR × 12 as Contractual ARR proxy<br/>
          • Flagged as contract_source = 'sap_proxy'<br/>
          • Non-whitelisted missing contracts: excluded from Contractual ARR (DQ issue)"]:::step

      P6["Compute Contractual ΔARR and Feed Waterfall<br/><br/>
          • ΔARR_T = EoP_T – BoP_T<br/>
          • Grain = month × SAP ID × material × contract_id<br/>
          • No opportunity data in historical mode"]:::step
    end


    %% ============================
    %% HISTORICAL CONTRACTUAL WATERFALL
    %% ============================

    subgraph W["Historical Contractual ARR Waterfall<br/><br/>(No opportunity linkage – BoP/EoP + tickets + product flags)"]
      direction TB

      W0["Total Contractual ARR Change<br/><br/>
          • ΔARR_T = EoP_T – BoP_T<br/>
          • Grain = SAP ID × material × contract_id × month (historical periods)"]:::step

      W1["1. Price Increase<br/><br/>
          • Use Finance/Qvantel price ref<br/>
          • Only rounds effective in month T<br/>
          • Book uplift as movement_price_increase<br/>
          • Subtract from ΔARR_T"]:::step

      W2["2. New ARR (6-month parent rule)<br/><br/>
          • At customer parent / ultimate parent<br/>
          • Parent ARR = 0 for T-6…T-1<br/>
          • Confirm Actual ARR / SAP revenue = 0 in T-6…T-1<br/>
          • Any positive Δ after Step 1<br/>
          • Book as movement_new<br/>
          • Subtract from remaining delta"]:::step

      W3["3. Churn – ServiceNow ticket (Full)<br/><br/>
          • termination_date + 1 ∈ month T<br/>
          • Ticket scope = Full churn<br/>
          • movement_arr = BoP_T for SAPID×material<br/>
          • Book as movement_churn_full<br/>
          • Subtract from remaining delta"]:::step

      W4["4. Downsell – ServiceNow ticket (Partial)<br/><br/>
          • termination_date + 1 ∈ month T<br/>
          • Ticket scope = Partial churn<br/>
          • movement_arr = BoP_T – EoP_T for affected lines<br/>
          • Book as movement_downsell_partial_ticket<br/>
          • Subtract from remaining delta"]:::step

      W5["5. Migration<br/><br/>
          On remaining negative ARR deltas (decreases) not classified in Steps 3–4:<br/>
          • always_migration_flag = Y → Migration<br/>
          • Retired → Active within same solution<br/>
          • Same solution, different revenue_type:<br/>
            pair negative with positive leg<br/>
          • Equal amounts → both Migration<br/>
          • Leftover pos → Upsell; leftover neg → Contraction<br/>
          • Subtract all migration legs from delta"]:::step

      W6["6. Downsell – Partial (non-ticket)<br/><br/>
          • ARR drops to 0 on a service<br/>
          • Not covered by Steps 3–5<br/>
          • lifecycle_status = Active / Limited / Retired<br/>
          • Book as movement_downsell_partial<br/>
          • Subtract from remaining delta"]:::step

      W7["7. Cross-sell<br/><br/>
          • BoP_T = 0, EoP_T > 0<br/>
          • Not classified as New (Step 2)<br/>
          • Not Migration (Step 5)
          • New service in existing customer<br/>
          • Book as movement_cross_sell<br/>
          • Subtract from remaining delta"]:::step

      W8["8. Upsell<br/><br/>
          • BoP_T > 0, EoP_T > BoP_T<br/>
          • Same service / material<br/>
          • Not Migration, not Cross-sell<br/>
          • Book as movement_upsell<br/>
          • Subtract from remaining delta"]:::step

      W9["9. Downsell – Contraction<br/><br/>
          • BoP_T > 0, EoP_T > 0
          • Negative residual change after Step 8
          • Service still active, scope/volume reduced
          • Book as movement_downsell_contraction
          • Subtract from remaining delta"]:::step

      W10["10. Volume Increase / Decrease (PAYG only)<br/><br/>
           • revenue_type = PAYG (from product metadata)
           • At ultimate parent level:
             – Only applied where ultimate parent has no non-PAYG movements in T
             – Otherwise PAYG deltas follow normal Steps 1–9
           • Sum remaining delta on PAYG materials
           • Book as movement_volume_payg
           • Subtract from remaining delta"]:::step

      W11["11. Residual (error / investigation signal)<br/><br/>
           • Residual_T = remaining unexplained delta
           • Not a business category
           • Flag when >2% ARR or >€1m for scope
           • Feed into DQ dashboards + manual review"]:::step
    end


    %% ============================
    %% CONTRACTUAL MOVEMENTS TABLE
    %% ============================

    M["Contractual ARR Movements (Gold)<br/><br/>
       • f_arr_movement<br/>
       • Contractual movement_type / movement_arr"]:::gold

    N1["Note – Contractual ARR Grain<br/><br/>
        • Contract data is used where available
        • Final Contractual ARR is modelled at service-level (month × SAPID × material)
        • Contract numbers are not consistently available, so contracts are attributes, not the primary grain"]:::step


    %% ============================
    %% ACTUAL ARR BUILD (LATE DIAGRAM MERGED)
    %% ============================

    subgraph A0["Build Actual ARR Base<br/><br/>(before movement classification)"]
      direction TB

      A0_1["1. Compute Actual MRR<br/><br/>
            • From SAP ledger (ARR-eligible only)
            • Subscriptions: recurring revenue in T
            • PAYG: monthly revenue in T"]:::step

      A0_2["2. Annualize to Actual ARR<br/><br/>
         • Subs: MRR_T × 12
         • PAYG: LTM revenue (rolling 12 months)
         • PAYG ARR = LTM revenue for active PAYG offerings,<br/>           except when offering expires within month T and no termination ticket exists (then ARR stops from T+1)
         • Grain = SAPID × material × month
         • Contract identifiers attached where available (not mandatory grain)"]:::step

      A0_3["3. Define BoP/EoP Actual ARR<br/><br/>
            • BoP_actual_T = EoP_actual_{T-1}
            • EoP_actual_T from A0_2
            • ΔARR_actual_T = EoP_actual_T – BoP_actual_T"]:::step
    end


    subgraph AW["Actual ARR Waterfall<br/><br/>(Ledger-first, aligned with contractual taxonomy)"]
      direction TB

      AW0["Total Actual ARR Change<br/><br/>
           • ΔA_T = EoP_actual_T – BoP_actual_T
           • Grain = SAPID × material × month"]:::step

      AW1["1. Price Increase (Actual)<br/><br/>
           • Use same price ref as contractual
           • For contracts with known price rounds
           • Book uplift that matches ledger change
             as movement_price_increase_actual
           • Subtract from ΔA_T"]:::step

      AW2["2. Contract-Aligned Movements<br/><br/>
           • For rows with contract_id_resolved
           • Compare ΔA_T with contractual ΔC_T
           • If |ΔA_T – ΔC_T| ≤ tolerance:
             – Copy contractual movement_type
             – movement_arr_actual = ΔA_T
           • Covers New / Migration / Upsell / Downsell / Churn etc.
           • Subtract copied amount from ΔA_T
           • Mark source = 'contract-aligned'"]:::step

      AW3["3. New Actual ARR not covered by contracts<br/><br/>
           • At customer parent level
           • No Actual ARR in T-6…T-1 AND
           • Positive residual ΔA_T after Step 2
           • If New Logo opportunity exists → tag as New_logo_actual
           • Else treat as New service for existing customer
           • Book as movement_new_actual
           • Subtract from ΔA_T"]:::step

      AW4["4. Churn – ServiceNow Ticket (Full, Actual side)<br/><br/>
           • termination_date + 1 ∈ month T
           • ARR in ledger drops from >0 → ≈0
           • Book BoP_actual_T as movement_churn_full_actual
           • Subtract from ΔA_T"]:::step

      AW5["5. Downsell – ServiceNow Ticket (Partial, Actual side)
           • termination_date + 1 ∈ month T
           • Scope = Partial churn
           • ARR in ledger reduces but not to zero
           • Book BoP_actual_T (for affected part) as movement_downsell_partial_ticket_actual
           • Subtract from ΔA_T"]:::step

      AW6["6. Ledger-Only Migrations
           • Remaining ΔA_T not explained by Steps 1–5
           • For material pairs within same solution:
             – Negative + positive movement in same month
             – Match min(|neg|, |pos|) as Migration_actual
           • Use product flags:
             – always_migration_flag = Y
             – Retired → Active within solution
           • Leftover pos = candidate Upsell_actual
             leftover neg = candidate Contraction_actual
           • Subtract all Migration_actual from ΔA_T"]:::step

      AW7["7. Upsell vs Contraction (Actual)
           • On remaining ΔA_T at service level:
             – BoP_actual_T > 0, EoP_actual_T > BoP_actual_T → Upsell_actual
             – BoP_actual_T > 0, EoP_actual_T > 0 and residual ΔA_T < 0 → Contraction_actual
           • Exclude any rows already classified above
           • Subtract Upsell_actual and Contraction_actual from ΔA_T"]:::step

      AW8["8. Cross-sell (Actual)
           • BoP_actual_T = 0, EoP_actual_T > 0
           • Not already tagged as New_actual (Step 3)
           • Not Migration_actual (Step 6)
           • Book as movement_cross_sell_actual
           • Subtract from ΔA_T"]:::step

      AW9["9. PAYG Volume (Actual)
           • revenue_type = PAYG
           • At ultimate parent level:
             – All remaining movements are PAYG only
           • Sum remaining ΔA_T on PAYG materials
           • Book as movement_volume_payg_actual
           • Subtract from ΔA_T"]:::step

      AW10["10. Residual (Actual ARR)
            • Residual_actual_T = remaining ΔA_T
            • Not a business event
            • Typical causes:
              – Timing mismatches vs contractual
              – Ledger mapping issues
              – Unmodelled phased-deal behaviour
            • Flag when >2% ARR or >€1m
            • Feed DQ dashboards + manual review"]:::step
    end


    O["Actual ARR Movements (Gold)<br/><br/>
       • f_actual_arr_movement<br/>
       • movement_type_actual, movement_arr_actual
       • source_flag = 'contract-aligned' / 'ledger-only'"]:::gold


    %% ============================
    %% GOLD TABLES (SERVICE + PARENT)
    %% ============================

    MF["Aggregate Contractual Movements<br/><br/>
        • From contract_id grain
        • To service-level grain: month × SAPID × material"]:::gold

    F["Service-Level ARR Wide Table (Gold)<br/><br/>
       Grain = month × SAP ID × material
       
       Attributes (examples):
       • beginning_arr_contractual / _actual
       • ending_arr_contractual / _actual
       • movement_price_increase / new / churn_full
       • movement_downsell_partial_ticket / _partial / _contraction
       • movement_migration / cross_sell / upsell
       • movement_volume_payg / residual
       • *_actual variants from f_actual_arr_movement
       • contract_id_resolved
      • contract_linkage_confidence
      • Contract info is an attribute (may be missing or inferred; not part of primary key)"]:::gold

    H["Parent-Level ARR Movements View (Gold)<br/><br/>
       Grain = month × Customer Parent
       • Join customer hierarchy (ultimate parent)
       • Aggregate service-level ARR & movements to parent
       • Apply mirroring / reclassification rules
       • Categorisation at ultimate parent + revenue type + service level
       • Basis for GDR / NDR and ARR bridge
       • CFO-facing customer-level view"]:::gold


    %% ============================
    %% POWER BI DATASETS
    %% ============================

    DS1["Power BI Dataset – Customer ARR<br/><br/>
         • Imports Parent View (H)
         • Joins Customer hierarchy
          • Exposes ARR bridge + GDR / NDR
          • Supports drill-down to SAPID × material via service-level table (F)"]:::ds

    DS2["Power BI Dataset – Product ARR
         • Imports Service Table (F)
         • Joins Product hierarchy
         • Exposes service-level roll-forward"]:::ds


    %% ============================
    %% POWER BI REPORTS / VIEWS
    %% ============================

    G1["Power BI Report – Customer Views
        • Customer ARR bridge
        • GDR / NDR by segment
        • CFO dashboards & drill-through"]:::cons

    G2["Power BI Report – Product Views
        • Product / service roll-forward
        • Expansion vs contraction trends
        • Drill to SAP ID / material"]:::cons


    %% ============================
    %% EDGES WITH LABELS
    %% ============================

    %% Contractual path
    A -->|"Contractual schedule snapshots<br/><br/>(historical BoP/EoP)"| P1
    B -->|"ARR-eligible revenue only"| X
    X -->|"PAYG LTM + subscription validation + Contractual ARR proxy for whitelisted missing contracts"| P1

    C -->|"Effective price increase data"| W1
    E -->|"Parent mapping<br/>for 6-month 'New' rule"| W2
    S -->|"Termination tickets<br/>(Full & Partial)"| W3
    S -->|"Termination tickets<br/>(Partial churn)"| W4
    E -->|"Solution / lifecycle / always-migration<br/>+ revenue_type flags"| W5
    E -->|"Lifecycle + status<br/>(Active / Limited / Retired)"| W6
    E -->|"Revenue type = PAYG<br/>+ parent-level view"| W10
    N1 -.-> P1

    %% Contractual movements into contractual movements table
    W1 -->|"movement_price_increase"| M
    W2 -->|"movement_new"| M
    W3 -->|"movement_churn_full"| M
    W4 -->|"movement_downsell_partial_ticket"| M
    W5 -->|"movement_migration"| M
    W6 -->|"movement_downsell_partial"| M
    W7 -->|"movement_cross_sell"| M
    W8 -->|"movement_upsell"| M
    W9 -->|"movement_downsell_contraction"| M
    W10 -->|"movement_volume_payg"| M
    W11 -->|"movement_residual"| M

    %% Actual ARR path
    X -->|"Actual MRR (ARR-eligible ledger)"| A0_1
    A0_1 --> A0_2
    A0_2 --> A0_3
    A0_3 --> AW0

    %% Actual waterfall edges + sources
    AW0 --> AW1
    C --> AW1

    AW1 --> AW2
    M -->|"Contractual ΔC_T + movement_type"| AW2

    AW2 --> AW3
    E --> AW3

    AW3 --> AW4
    S --> AW4

    AW4 --> AW5
    S --> AW5

    AW5 --> AW6
    E --> AW6

    AW6 --> AW7
    AW7 --> AW8
    AW8 --> AW9
    E --> AW9
    AW9 --> AW10

    %% Actual movements output
    AW1 --> O
    AW2 --> O
    AW3 --> O
    AW4 --> O
    AW5 --> O
    AW6 --> O
    AW7 --> O
    AW8 --> O
    AW9 --> O
    AW10 --> O

    %% Gold table wiring
    M -->|"Contractual movements (contract-level)"| MF
    MF -->|"Service-level contractual movements"| F
    O -->|"Actual movements<br/><br/>(by service)"| F

    %% Aggregation to parent
    F -->|"Aggregate + mirror<br/><br/>per customer parent"| H

    %% Power BI dataset connections
    H -->|"Import / DirectQuery<br/><br/>customer ARR + movements"| DS1
    F -->|"Import / DirectQuery<br/><br/>service-level ARR + movements"| DS2

    %% Reports connect to datasets
    DS1 -->|"Customer metrics<br/><br/>ARR bridge, GDR / NDR"| G1
    DS2 -->|"Product metrics<br/><br/>roll-forward by service"| G2

    %% Hierarchy joins at reporting time
    E -->|"Customer hierarchy for parent-level aggregation & rules"| H
    E -->|"Customer attributes & cohorts"| DS1
    E -->|"Product hierarchy & revenue types"| DS2


    %% ============================
    %% STYLES
    %% ============================

    classDef src fill:#eef,stroke:#555,stroke-width:1px;
    classDef step fill:#fdf6e3,stroke:#888,stroke-width:1px;
    classDef gold fill:#e8ffe8,stroke:#4a4,stroke-width:1.2px;
    classDef ds fill:#fff2cc,stroke:#b58900,stroke-width:1.2px;
    classDef cons fill:#e0f0ff,stroke:#468,stroke-width:1.2px;
```

# A development bench for the accelerator’s thermal assembly

Completed evidence review, 4 October 2026. Outcome: converged with researched gaps. This is an opportunity assessment, not evidence of a built autonomous system, a customer commitment, or a defect in the selected Lenovo rack.

The strongest current starting hypothesis is **finding and verifying the material, mounting and cooling configuration that lets a new high-power accelerator meet its thermal requirements over repeated use**. The customer would be a server or cooling-module development team that can change the relevant hardware and assembly instructions.

The important decision crosses component boundaries. A hot chip might need a different coldplate, but it might instead need a different interface material, mounting arrangement or local fluid path. An initially good assembly can also degrade through repeated heating. A useful system would determine which change is justified, implement a controlled experiment, and deliver a reproducible solution with a defined operating envelope.

This is a proposed product built around an engineering outcome. Existing test vehicles, precision fixtures, instruments, simulation and optimization software are possible infrastructure. Their existence establishes neither that our system exists nor that there is an unmet commercial need.

## What makes this worth investigating

The research supports three parts of the problem, at different levels of specificity:

- The OCP cooling roadmap describes different heights and thermal paths within GPU/HBM assemblies, plus heat transfer between neighboring components that depends on workload. These create a coupled package-level design problem. It is a 2024 engineering roadmap; its future projections are not current production facts. [OCP, pp.8–12](https://www.opencompute.org/documents/30-coolant-a-durable-roadmap-for-the-future-rev1-0-pdf).
- A 2026 Purdue experiment deliberately varied mating-surface curvature and observed thermal-grease movement, voiding and degradation during power cycling. That supports a physical mechanism linking geometry and material reliability. The public author abstract describes a heater and transparent air-cooled lens; it is not a trial on a GPU coldplate. Full journal text was not available in this review. [Purdue author abstract](https://engineering.purdue.edu/MTEC/publications/experimental-characterization-of-thermal-grease-degradation-between-warped-mating-surfaces-in-powercycled-assemblies).
- The accepted database contains mounting, surface inspection, thermal testing, flow/pressure measurement and loop-design methods. The OCP qualification procedure explicitly uses a representative processor assembly and separates specimen pressure loss from the surrounding test loop. These are constituent methods, not a demonstrated automated diagnosis policy. [OCP qualification methods, pp.15–19](https://www.opencompute.org/documents/ocp-cold-plate-development-and-qualification-with-integrated-comments-pdf).

The useful synthesis is to optimize the **assembled system and its durability**, while using controlled interventions to avoid redesigning the wrong component. Whether that saves enough engineering effort or development delay remains unmeasured.

## The proposed first bench and campaign

Begin with one owner-controlled accelerator thermal assembly and local cooling branch. Identify the actual accessible interface; do not assume an exposed-die package. Obtain its mechanical limits, thermal requirements, failed and known-good specimens, and permission to change approved variables. Start on a calibrated representative heat source, then verify transfer to actual product hardware.

| Stage | Physical work and measurements | Engineering decision |
|---|---|---|
| Establish a trustworthy baseline | Inspect actual geometry; record specimen and assembly history; measure mounting repeatability and force/displacement; calibrate temperature, power, flow and pressure; remove trapped air. Torque alone does not establish contact-pressure distribution. | Is the observed failure larger than setup and measurement variation? |
| Reproduce the problem | Apply defined spatial heat patterns and load cycles at controlled inlet conditions. Record local temperatures and hydraulic behavior together. | Which operating conditions produce the failure reliably? |
| Distinguish causes | Compare controlled remounts and approved interface variants with fluid-path interventions and known-good controls. Keep the other variables fixed or explicitly randomized. | Does evidence support contact/mounting, material aging, fluid restriction, plate geometry, or an unresolved combination? |
| Change the design or recipe | Replace material or retention hardware, install a plate variant, or issue a justified fabrication change. Record the actual as-built condition. | Did the predicted physical effect occur? |
| Verify the solution | Freeze the change; test fresh specimens/remounts and conditions withheld from the search. Complete the relevant cycling, leak and mechanical checks, then product-level confirmation. | Does the same change meet all owner requirements reproducibly? |

A single temperature improvement does not uniquely identify a cause. Measure the aged assembly before removing or remounting it, since disturbance can erase the failure evidence; reserve separate specimens for destructive inspection. A passing surrogate does not release the actual product. Newly machined or joined plates, destructive failure analysis and reliability exposure remain separate physical dependencies.

Corintis advertises programmable spatial heaters and temperature sensing, including interface-material power-cycle evaluation. This is a possible foundation to assess, not a purchasing recommendation; its page currently states that certification is underway. [Therminator](https://corintis.com/therminator).

## What each part of our system would do

**The LLM:** maintain competing explanations using drawings, material information, assembly history, surface measurements, thermal maps, pressure/flow traces and previous failures. Propose an experiment that separates explanations; identify missing controls; interpret the combined evidence; prepare a traceable engineering-change package. Numerical fitting, physics simulation, experiment optimization and acceptance calculations remain specialized tools. Fast control and equipment protection remain deterministic.

**Instruments and hard automation:** generate controlled heat and flow, acquire synchronized measurements, dispense or place approved interface materials, apply measured mounting loads, and run repeatable cycling. Dedicated fixtures should establish repeatability before adding complexity.

**Conventional robotics:** exchange identifiable specimens and plates, use controlled fastening tools, and transfer parts between inspection and test stations where that improves throughput or consistency.

**Flexible learned robotics:** potentially handle variable hose or cable arrangements and connector presentation. Its usefulness must be demonstrated on those particular actions. It is not required to establish the first engineering loop, and no percentage split can be justified from the evidence.

**People and external fabrication:** authorize new design families and release decisions, resolve exceptions, manufacture new geometry, and perform specialist analysis. The proposed system cannot remove the physical time required for fabrication or reliability testing.

## How it could be packaged

The proposed offer is a bench and experimental-workflow system installed with an engineering owner, initially scoped to one assembly family. Its output is a verified change package: approved material and geometry revisions, assembly instructions, raw traceable measurements, uncertainty, tested conditions and remaining limits.

The economic hypothesis is fewer wrong prototype changes and less unresolved engineering work before qualification. It is consequential because thermal constraints can limit use of costly accelerator hardware, but this review establishes no price, customer budget, avoided cost, campaign volume or willingness to pay.

CoolIT already describes integrated simulation, prototyping, validation and manufacturing engineering. That is a serious baseline and potential partner capability. Our proposed additional value must be measured against a capable team using those tools. [CoolIT development workflow](https://www.coolitsystems.com/capabilities/design-engineering/).

## Alternatives retained

| Candidate | Why it remains interesting | Present constraint |
|---|---|---|
| Internal power-converter transient margin | Reduced bulk capacitance trades density against load-step response; synchronous electrical measurements and editable control/hardware provide a concrete experimental problem. | Must own the design and firmware. Existing successful reference fixes do not establish a new unresolved customer case. |
| Optical package performance after bonding and stress | Alignment, attachment, materials and mechanical construction can interact; IBM reports an actual failure-driven development return. | Specialized package/process access and long stress tests; outside the accepted rack-route inventory. |
| HBM encapsulant and process development | Manufacturer explicitly describes representative test vehicles, defects, countermeasures and improved materials. | Proprietary formulation, packaging, metrology and qualification access. |
| High-speed electrical fixture/channel correlation | Distinguishing a measurement artifact from a real channel problem could avoid an incorrect redesign. | Needs a specific editable channel, calibrated fixture and representative failure data. |
| Fan development | Clearest documented simulation–prototype–measurement feedback loop in the accepted studies. | Less distinctive fit to the requested emerging-stack opportunity; incremental benefit still unknown. |
| CMP materials, PCB processes, solder joints and power contacts | Concrete measurements and, in several cases, physical development loops. | Retained in the audit; no better owner-specific entry established. |

The power alternatives remain distinct: internal converter load response, AC interruption/recovery, and shelf current sharing/distribution need different tests and access. An AC/DC reference cannot substantiate an 800 V DC/DC manufacturing claim. [Infineon reference, §§3.1.4 and 4.2](https://www.infineon.com/assets/row/public/documents/24/42/infineon-ref-8kw-hfhd-psu-applicationnotes-en.pdf).

The optical and HBM loops are supported by [IBM’s experimental package paper](https://arxiv.org/pdf/2412.06570) and [SK hynix’s material-development account](https://news.skhynix.com/en/rulebreaker-revolutions-mr-muf-unlocks-hbm-heat-control/). They do not prove an autonomous implementation or commercial demand.

## What would establish or reject the opportunity

Compare three configurations using the same hardware, information and unchanged acceptance criteria: the current engineering workflow; an integrated bench with conventional experiment planning; and that bench with LLM-assisted hypothesis and experiment selection. Use independently assessed failures and held-out conditions.

Measure verified solutions, false fixes, unnecessary physical changes, engineer effort, repeatability and elapsed time separated into setup, experimentation, fabrication and stress. A faster report is not an engineering solution. If conventional methods reach the same solutions with the same effort, the proposed LLM increment is unsupported. If representative specimens or change authority are unavailable, this is not an actionable first customer.

## Research boundary and trace

The three blind reviews screened all 18 accepted study summaries and all 1,695 operation/reference-operation index entries, then selectively followed important candidates into authoritative evidence and original sources. This does not mean every historical evidence field or every source was independently reread. The graph contains 180 components; only 43 component IDs have accepted-with-gaps manufacturing coverage. Ten are in research and 127 queued. Five pending proposal groups remain unaccepted.

Principal accepted DB anchors are `gpu-coldplate:A-R-OCP-QUAL`, operations `A2-O-02-MOUNT`, `A2-O-02-RECORD`, `A2-O-02-CALCULATE`, `A2-O-03-BASELINE`, `A2-O-03-SUBTRACT`, and `A2-OCP-SURFACE`; plus `I5-BOYD-FLOW-SIM` and `I5-BOYD-COMPONENT-DESIGN`. Purdue, programmable spatial test vehicles and the refined aging experiment are follow-up evidence and proposed synthesis, not newly accepted Lenovo manufacturing facts.

Full per-study coverage, source-reading limits, minority alternatives and disagreements are retained in the frozen submissions and discrepancy ledger. Canonical graph, routes and queue were not changed by this review.

The review used three frozen blind investigations and three complete replacement peer-informed revisions after an interruption. The revisions agree on the conditional thermal lead and evidence boundaries; they do not establish a universal economic ordering of alternatives. All ten discrepancies have recorded dispositions. [Structured accepted assessment](accepted.json), [discrepancy decisions](discrepancies.json), and [run record](run.json) preserve the audit.

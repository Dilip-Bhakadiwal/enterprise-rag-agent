# GraphRAG-Bench Benchmark Test Questions Handbook

> **Quick Copy Guide**: You can copy any question directly into the **Nexora AI Copilot** chat panel at http://localhost:8000 to verify live retrieval, citations, and answers against the ground truth.

---

## 📋 Table of Contents
1. [Medical & Clinical Oncology Questions](#1-medical--clinical-oncology-questions)
   - [Fact Retrieval (Direct Answers)](#medical-fact-retrieval)
   - [Complex Reasoning & Multi-Hop](#medical-complex-reasoning)
   - [Contextual Summarization](#medical-contextual-summarization)
2. [Literature & Entity Triples Questions](#2-literature--entity-triples-questions)
   - [Multi-Hop Entity Relations](#novel-fact-retrieval)
   - [Complex Reasoning Across Narratives](#novel-complex-reasoning)
3. [AI Engineering & Portfolio Benchmark Questions](#3-ai-engineering--portfolio-benchmark-questions)

---

## 1. Medical & Clinical Oncology Questions

### Medical Fact Retrieval

#### 1. What is the most common type of skin cancer?
- **Expected Ground Truth Answer**: Basal cell carcinoma (BCC) is the most common type of skin cancer.
- **Evidence / Triples**: Basal cell carcinoma (BCC) is the most common type of skin cancer

#### 2. From which cell type does basal cell carcinoma arise?
- **Expected Ground Truth Answer**: Basal cell carcinoma arises from basal cells in the lower part of the epidermis.
- **Evidence / Triples**: BCC arises from basal cells in the lower part of the epidermis

#### 3. Which anatomical locations are most commonly affected by basal cell carcinoma?
- **Expected Ground Truth Answer**: BCC most commonly develops in sun-exposed areas such as the face, head, and neck.
- **Evidence / Triples**: BCC most commonly develops in sun-exposed areas such as the face, head, and neck

#### 4. What is the primary risk factor for basal cell carcinoma?
- **Expected Ground Truth Answer**: UV radiation exposure is a primary risk factor for BCC.
- **Evidence / Triples**: UV radiation exposure is a primary risk factor for BCC

#### 5. How does fair skin affect the risk of developing BCC?
- **Expected Ground Truth Answer**: Fair skin increases the risk of BCC.
- **Evidence / Triples**: Fair skin, light hair, and light eye color increase the risk of BCC

#### 6. Does older age influence the risk of basal cell carcinoma?
- **Expected Ground Truth Answer**: Older age is associated with higher risk of BCC.
- **Evidence / Triples**: Older age is associated with higher risk of BCC

#### 7. How does family history impact the risk of basal cell carcinoma?
- **Expected Ground Truth Answer**: Family history of skin cancer increases risk of BCC.
- **Evidence / Triples**: History of skin cancer or family history increases risk of BCC

#### 8. Is immune suppression a risk factor for BCC?
- **Expected Ground Truth Answer**: Immune suppression is a risk factor for BCC.
- **Evidence / Triples**: Radiation therapy and immune suppression are risk factors for BCC

#### 9. What are common symptoms of basal cell carcinoma?
- **Expected Ground Truth Answer**: BCC presents as flat, pale or yellow areas, red patches, shiny bumps, open sores, or brown/black bumps with rolled borders.
- **Evidence / Triples**: BCC presents as flat, pale or yellow areas, red patches, shiny bumps, open sores, or brown/black bumps with rolled borders

#### 10. Which diagnostic methods are used for BCC?
- **Expected Ground Truth Answer**: Diagnosis of BCC involves medical and family history, physical exam, skin exam, biopsy, and sometimes imaging.
- **Evidence / Triples**: Diagnosis of BCC involves medical and family history, physical exam, skin exam, biopsy, and sometimes imaging

#### 11. What is the most common treatment for basal cell carcinoma?
- **Expected Ground Truth Answer**: Surgery is the most common treatment for BCC.
- **Evidence / Triples**: Surgery is the most common treatment for BCC

#### 12. When might radiation therapy be used in BCC?
- **Expected Ground Truth Answer**: Radiation therapy may be used in some cases of BCC.
- **Evidence / Triples**: Radiation therapy or systemic therapy may be used in some cases of BCC

#### 13. What is recurrence in the context of BCC?
- **Expected Ground Truth Answer**: Recurrence refers to BCC returning to the original site or spreading to lymph nodes or distant sites.
- **Evidence / Triples**: Recurrence refers to BCC returning to the original site or spreading to lymph nodes or distant sites

#### 14. What does follow-up for BCC typically include?
- **Expected Ground Truth Answer**: Follow-up includes full skin exams with a doctor at least once a year.
- **Evidence / Triples**: Follow-up includes full skin exams with a doctor at least once a year

#### 15. Which skin cancer subtype arises from basal cells?
- **Expected Ground Truth Answer**: Basal cell carcinoma is the skin cancer subtype that arises from basal cells.
- **Evidence / Triples**: Basal cell carcinoma (BCC) is the most common type of skin cancer

#### 16. What anatomical layer do basal cells belong to?
- **Expected Ground Truth Answer**: Basal cells are located in the lower part of the epidermis.
- **Evidence / Triples**: BCC arises from basal cells in the lower part of the epidermis

#### 17. Is sun exposure a risk factor for BCC?
- **Expected Ground Truth Answer**: Sun exposure is a risk factor for BCC.
- **Evidence / Triples**: Sun exposure

#### 18. Do tanning beds increase the risk of BCC?
- **Expected Ground Truth Answer**: Tanning beds are a risk factor for BCC.
- **Evidence / Triples**: Tanning beds are listed as a risk factor for BCC in the ontology

#### 19. What hair and eye colors are associated with increased BCC risk?
- **Expected Ground Truth Answer**: Red hair, blond hair, and light eye color increase the risk of BCC.
- **Evidence / Triples**: Fair skin, light hair, and light eye color increase the risk of BCC

#### 20. Can a history of radiation therapy increase BCC risk?
- **Expected Ground Truth Answer**: Radiation therapy is a risk factor for BCC.
- **Evidence / Triples**: Radiation therapy and immune suppression are risk factors for BCC

### Medical Complex Reasoning

#### 1. Why is a patient with fair skin and a history of organ transplant at particularly high risk for developing basal cell carcinoma?
- **Expected Ground Truth Answer**: Because both fair skin and immune suppression from organ transplant are independent risk factors for BCC.
- **Evidence / Triples**: Fair skin, light hair, and light eye color increase the risk of BCC; Immune suppression is a risk factor for BCC

#### 2. If a patient presents with a shiny bump on the face and has a history of tanning bed use, what diagnostic steps should be taken to evaluate for basal cell carcinoma?
- **Expected Ground Truth Answer**: A medical and family history, physical and skin exam, and biopsy should be performed.
- **Evidence / Triples**: BCC presents as shiny bumps; BCC most commonly develops in sun-exposed areas such as the face

#### 3. How does the management of recurrent basal cell carcinoma differ from initial treatment, and what factors influence this?
- **Expected Ground Truth Answer**: Management of recurrence depends on risk and recurrence site, with treatment options tailored accordingly.
- **Evidence / Triples**: Recurrence refers to BCC returning to the original site or spreading to lymph nodes or distant sites; Management of recurrence involves treatment options based on risk and recurrence

#### 4. Which combination of risk factors should prompt earlier and more frequent skin exams for BCC?
- **Expected Ground Truth Answer**: A combination of older age, fair skin, and family history of skin cancer should prompt more frequent skin exams.
- **Evidence / Triples**: Older age is associated with higher risk of BCC; Fair skin and family history of skin cancer increase risk of BCC

#### 5. Why might a patient with a shiny bump and a history of radiation therapy require both imaging and biopsy for diagnosis?
- **Expected Ground Truth Answer**: Because radiation therapy is a risk factor for BCC and shiny bumps are a symptom, so both imaging and biopsy help confirm diagnosis.
- **Evidence / Triples**: Radiation therapy is a risk factor for BCC; BCC presents as shiny bumps

#### 6. What follow-up strategy is recommended for a patient treated for BCC on the neck, and why?
- **Expected Ground Truth Answer**: Annual full skin exams are recommended to monitor for recurrence or new lesions.
- **Evidence / Triples**: BCC most commonly develops in sun-exposed areas such as the neck; Recurrence refers to BCC returning to the original site

#### 7. How does UV radiation contribute to both the development and recurrence of basal cell carcinoma?
- **Expected Ground Truth Answer**: UV radiation is a primary risk factor for BCC and continued exposure increases recurrence risk.
- **Evidence / Triples**: UV radiation exposure is a primary risk factor for BCC; Recurrence refers to BCC returning to the original site or spreading

#### 8. Why should a patient with a family history of skin cancer and light eye color be particularly vigilant about skin changes?
- **Expected Ground Truth Answer**: Because both family history and light eye color are risk factors for BCC, increasing overall risk.
- **Evidence / Triples**: Family history increases risk of BCC; Light eye color increases the risk of BCC

#### 9. What is the rationale for recommending surgery as the most common treatment for BCC lesions on sun-exposed areas?
- **Expected Ground Truth Answer**: Because BCC most commonly develops on sun-exposed areas and surgery is the most effective treatment.
- **Evidence / Triples**: BCC most commonly develops in sun-exposed areas such as the face, head, and neck; Surgery is the most common treatment for BCC

#### 10. Which symptoms and risk factors together would most strongly indicate the need for biopsy to rule out BCC?
- **Expected Ground Truth Answer**: A flat pale area on sun-exposed skin in a fair-skinned patient with a history of sun exposure strongly indicates the need for biopsy.
- **Evidence / Triples**: BCC presents as flat, pale or yellow areas; BCC most commonly develops in sun-exposed areas

#### 11. How do immune suppression and prior radiation therapy interact to affect BCC risk and management?
- **Expected Ground Truth Answer**: Both are risk factors that increase BCC risk and may necessitate more aggressive management.
- **Evidence / Triples**: Radiation therapy and immune suppression are risk factors for BCC; Management of recurrence involves treatment options based on risk and recurrence

#### 12. What combination of anatomical location and cell type defines basal cell carcinoma?
- **Expected Ground Truth Answer**: BCC arises from basal cells in the lower part of the epidermis, often in sun-exposed locations.
- **Evidence / Triples**: BCC arises from basal cells in the lower part of the epidermis; BCC most commonly develops in sun-exposed areas such as the face, head, and neck

#### 13. Why is annual follow-up with full skin exams critical for patients with a history of BCC?
- **Expected Ground Truth Answer**: Because recurrence can occur at the original site or spread, so annual full skin exams help detect new or returning lesions.
- **Evidence / Triples**: Recurrence refers to BCC returning to the original site or spreading to lymph nodes or distant sites; Follow-up includes full skin exams with a doctor at least once a year

#### 14. Why might systemic therapy be considered for a patient with BCC that has spread to distant sites?
- **Expected Ground Truth Answer**: Because systemic therapy is a treatment option for BCC that has recurred or spread to distant sites.
- **Evidence / Triples**: Recurrence refers to BCC spreading to distant sites; Systemic therapy may be used in some cases of BCC

#### 15. How do medical and family history contribute to the diagnostic process for BCC in a patient with a suspicious skin lesion?
- **Expected Ground Truth Answer**: Both are part of the diagnostic workup to assess risk and guide further testing like biopsy.
- **Evidence / Triples**: Diagnosis of BCC involves medical and family history, physical exam, skin exam, biopsy; History of skin cancer or family history increases risk of BCC

### Medical Contextual Summarization

#### 1. What are the main risk factors associated with the development of basal cell carcinoma?
- **Expected Ground Truth Answer**: Basal cell carcinoma risk is increased by UV radiation, sun exposure, tanning beds, fair skin, light hair and eye color, older age, prior or family history of skin cancer, radiation therapy, immune suppression, organ transplant, and autoimmune disease.
- **Evidence / Triples**: UV radiation exposure is a primary risk factor for BCC; Fair skin, light hair, and light eye color increase the risk of BCC

#### 2. Which anatomical locations and cell types are most commonly involved in basal cell carcinoma?
- **Expected Ground Truth Answer**: Basal cell carcinoma arises from basal cells in the lower part of the epidermis and most commonly develops in sun-exposed areas such as the face, head, and neck, but can occur anywhere on the body.
- **Evidence / Triples**: BCC arises from basal cells in the lower part of the epidermis; BCC most commonly develops in sun-exposed areas such as the face, head, and neck

#### 3. What are the typical symptoms and presentations of basal cell carcinoma?
- **Expected Ground Truth Answer**: Basal cell carcinoma typically presents as flat pale or yellow areas, red patches, shiny bumps, open sores, or brown or glossy black bumps with rolled borders, often appearing as skin lesions.
- **Evidence / Triples**: BCC presents as flat, pale or yellow areas, red patches, shiny bumps, open sores, or brown/black bumps with rolled borders; Basal cell carcinoma symptoms include flat pale or yellow area

#### 4. Which diagnostic methods are used to confirm basal cell carcinoma and what does the process involve?
- **Expected Ground Truth Answer**: Diagnosis of basal cell carcinoma involves a combination of medical and family history, physical and skin exams, biopsy, and sometimes imaging to confirm the presence and extent of disease.
- **Evidence / Triples**: Diagnosis of BCC involves medical and family history, physical exam, skin exam, biopsy, and sometimes imaging; Diagnostic methods for BCC include medical history, family history, physical exam, skin exam, biopsy, and imaging

#### 5. What are the standard treatment options for basal cell carcinoma?
- **Expected Ground Truth Answer**: Surgery is the most common treatment for basal cell carcinoma, with radiation therapy or systemic therapy used in selected cases.
- **Evidence / Triples**: Surgery is the most common treatment for BCC; Radiation therapy or systemic therapy may be used in some cases of BCC

#### 6. What constitutes recurrence in basal cell carcinoma and how is it managed?
- **Expected Ground Truth Answer**: Recurrence in basal cell carcinoma refers to the cancer returning to the original site or spreading to lymph nodes or distant sites, with management involving treatment options based on risk and recurrence.
- **Evidence / Triples**: Recurrence refers to BCC returning to the original site or spreading to lymph nodes or distant sites; Recurrence in BCC can include spread to lymph nodes

#### 7. What follow-up practices are recommended after treatment for basal cell carcinoma?
- **Expected Ground Truth Answer**: Follow-up after basal cell carcinoma includes a full skin exam with a doctor at least once a year to monitor for recurrence or new lesions.
- **Evidence / Triples**: Follow-up includes full skin exams with a doctor at least once a year; Full skin exam is a follow-up method for BCC

#### 8. How does a patient’s medical and family history contribute to the diagnosis and risk assessment of basal cell carcinoma?
- **Expected Ground Truth Answer**: A patient's medical and family history are used both to assess risk for basal cell carcinoma and as part of the diagnostic process to identify individuals at higher risk.
- **Evidence / Triples**: Diagnosis of BCC involves medical and family history; History of skin cancer or family history increases risk of BCC

#### 9. What are the connections between risk factors, symptoms, and anatomical location in basal cell carcinoma?
- **Expected Ground Truth Answer**: Basal cell carcinoma most often affects sun-exposed areas such as the face, head, and neck, with risk factors including UV radiation and fair skin, and typically presents with symptoms like flat pale or yellow areas, red patches, shiny bumps, open sores, or brown/black bumps with rolled borders.
- **Evidence / Triples**: BCC most commonly develops in sun-exposed areas such as the face, head, and neck; UV radiation exposure is a primary risk factor for BCC

#### 10. What are the major risk factors and disease locations associated with primary CNS lymphoma?
- **Expected Ground Truth Answer**: Primary CNS lymphoma most commonly affects the brain, spinal cord, cerebrospinal fluid, and eyes, with risk factors including immunodeficiency disorders, HIV infection, Epstein-Barr virus, autoimmune diseases such as lupus, organ transplant, and older age.
- **Evidence / Triples**: Primary CNS lymphoma most commonly affects the brain, but can also involve the spinal cord, cerebrospinal fluid, and eyes; Impaired immune system is a risk factor for primary CNS lymphoma

---

## 2. Literature & Entity Triples Questions

### Novel Fact Retrieval & Multi-Hop Relations

#### 1. In the narrative of 'An Unsentimental Journey through Cornwall', which plant known scientifically as Erica vagans is also referred to by another common name, and what is that name?
- **Expected Ground Truth Answer**: Cornish heath
- **Evidence / Triples**: (erica vagans, is also known as, Cornish heath).

#### 2. Within the account of the royal visit to St. Michael's Mount in Cornwall, who is identified as the person who married Princess Frederica of Hanover?
- **Expected Ground Truth Answer**: Baron Von Pawel-Rammingen
- **Evidence / Triples**: (Baron Von Pawel-Rammingen,married,Princess Frederica of Hanover)

#### 3. According to the narrative's discussion of historic sites, in which region of France is Mont St. Michel located?
- **Expected Ground Truth Answer**: Normandy
- **Evidence / Triples**: (Mont St. Michel,was in,Normandy)

#### 4. In the historical account relating to St. Michael's Mount, which individual is said to have caused himself to be bled to death there?
- **Expected Ground Truth Answer**: Henry de la Pomeroy
- **Evidence / Triples**: (Henry de la Pomeroy,caused himself to be bled to death in,St. Michael's Mount)

#### 5. Within the Cornish legends described in the narrative, who was the figure doomed to empty Dozmare Pool as a punishment?
- **Expected Ground Truth Answer**: Tregeagle
- **Evidence / Triples**: (Tregeagle,was doomed to empty,Dozmare Pool)

#### 6. In reference to the royal visit to St. Michael's Mount described in the narrative, to which princess did the Queen show motherly kindness during her stay?
- **Expected Ground Truth Answer**: Princess Frederica of Hanover
- **Evidence / Triples**: (Queen,shown motherly kindness to,Princess Frederica of Hanover)

#### 7. According to the description of Kynance Cove in Cornwall, which specific feature is included as a part of Kynance Cove?
- **Expected Ground Truth Answer**: Kynance Sands
- **Evidence / Triples**: (Kynance Sands,part of,Kynance Cove)

#### 8. In the account of the travelers' visit to Kynance Cove, what natural landmarks are mentioned as being located near or within Kynance Cove, such as Asparagus Island, Gull Rock, and Bellows?
- **Expected Ground Truth Answer**: Asparagus Island, Gull Rock, and Bellows
- **Evidence / Triples**: (Kynance Cove,is located near,Asparagus Island); (Gull Rock,is located near,Kynance Cove)

#### 9. During the travelers' exploration of the Cornish coastline in the narrative, what notable geographical feature is located near Housel Cove?
- **Expected Ground Truth Answer**: Penolver is located near Housel Cove.
- **Evidence / Triples**: (Housel Cove,is near,Penolver)

#### 10. In the retelling of the Arthurian legend within the novel, who is the character credited with producing King Arthur?
- **Expected Ground Truth Answer**: Merlin produced King Arthur.
- **Evidence / Triples**: (Merlin, produced, King Arthur)

#### 11. According to the narrative's summary of Arthurian history, who was proclaimed king after the death of Uther Pendragon?
- **Expected Ground Truth Answer**: King Arthur was proclaimed king after Uther Pendragon.
- **Evidence / Triples**: (King Arthur,was proclaimed king in the stead of,Uther Pendragon)

#### 12. Within the summary of Arthurian legend provided in the narrative, with whom did King Arthur engage in battle?
- **Expected Ground Truth Answer**: King Arthur fought with Mordred.
- **Evidence / Triples**: (King Arthur,fought with,Mordred)

#### 13. In the context of the Arthurian story as recounted in the narrative, which character fell in love with Ygrayne, leading to significant events in the legend?
- **Expected Ground Truth Answer**: Uther Pendragon fell in love with Ygrayne.
- **Evidence / Triples**: (Uther Pendragon, fell in love with, Ygrayne)

#### 14. In the novel's retelling of the end of King Arthur's story, who was the knight entrusted to throw the sword Excalibur into the mere?
- **Expected Ground Truth Answer**: Sir Bedevere threw Excalibur.
- **Evidence / Triples**: (Sir Bedevere,threw,Excalibur)

#### 15. Aside from Penolver, what other prominent feature is described as being near Housel Cove in the narrative?
- **Expected Ground Truth Answer**: Lizard Lights is near Housel Cove.
- **Evidence / Triples**: (Housel Cove,is near,Lizard Lights)

#### 16. According to the journey described in the narrative, in which county of England is the town of Marazion located?
- **Expected Ground Truth Answer**: Marazion is located in Cornwall.
- **Evidence / Triples**: (Marazion,is in,Cornwall)

#### 17. During the journey through Cornwall, who is identified as the driver responsible for transporting the main party by carriage?
- **Expected Ground Truth Answer**: Charles is the driver of the carriage.
- **Evidence / Triples**: (driver,is,Charles)

#### 18. In the account of the road journey after passing through Penzance, to which location did Charles travel with the carriage?
- **Expected Ground Truth Answer**: Charles went to Whitesand Bay after passing through Penzance.
- **Evidence / Triples**: (Charles,passed through,Penzance); (Charles,went to,Whitesand Bay)

#### 19. During the first evening at The Lizard, what did Charles call out excitedly upon seeing the lights, as described in the narrative?
- **Expected Ground Truth Answer**: Charles called out 'The Lizard Lights'.
- **Evidence / Triples**: (Charles,called out,The Lizard Lights)

#### 20. In the context of the story's visit to Mullion, which individual did Mary Mundy express her admiration for?
- **Expected Ground Truth Answer**: Mary Mundy admired the Professor.
- **Evidence / Triples**: (Mary Mundy,admired,Professor)

#### 21. Within the travel narrative, in which English county is Whitesand Bay described as being located?
- **Expected Ground Truth Answer**: Whitesand Bay is located in Cornwall.
- **Evidence / Triples**: (Whitesand Bay,is in,Cornwall)

#### 22. On the occasion of their outing described in the narrative, to which destination did the carriage ultimately travel?
- **Expected Ground Truth Answer**: The carriage went to Whitesand Bay.
- **Evidence / Triples**: (carriage,went to,Whitesand Bay)

#### 23. Within the story's depiction of the Old Inn at Mullion, who is credited with writing a poem about Mary Mundy?
- **Expected Ground Truth Answer**: The Scotch Professor wrote a poem about Mary Mundy.
- **Evidence / Triples**: (Scotch Professor,wrote a poem about,Mary Mundy)

#### 24. According to the journey through coastal villages described in the book, where is the fishing village of Cadgwith located?
- **Expected Ground Truth Answer**: Cadgwith is located in Cornwall.
- **Evidence / Triples**: (Cadgwith,located in,Cornwall)

#### 25. During the visit to Mullion, who was mentioned as being considered the best ghost-layer in England?
- **Expected Ground Truth Answer**: Thomas Flavel was the best ghost-layer in England.
- **Evidence / Triples**: (Thomas Flavel,was the best ghost-layer in,England)

### Novel Complex Narrative Reasoning

#### 1. Within the context of Arthurian legend as discussed by the narrator in 'An Unsentimental Journey through Cornwall', what is the relationship between King Arthur and Sir Launcelot, and how is Sir Launcelot described in relation to King Arthur and the Knights of the Round Table?
- **Expected Ground Truth Answer**: Sir Launcelot was a knight of King Arthur and was one of the Knights of the Round Table.
- **Evidence / Triples**: (Sir Launcelot,was a knight of,King Arthur); (Sir Launcelot,was one of,Knights of the Round Table)

#### 2. According to the narrator's reflections in 'An Unsentimental Journey through Cornwall', how is King Arthur associated with the Land of Lyonesse, and what is said about his journey there?
- **Expected Ground Truth Answer**: King Arthur is associated with the Land of Lyonesse and was said to have sailed there.
- **Evidence / Triples**: (King Arthur,was said to have sailed to,Land of Lyonesse); (King Arthur,is associated with,Lyonesse)

#### 3. In 'An Unsentimental Journey through Cornwall', the narrator encounters John Curgenven, a Cornish boatman known as the stroke-oar. In what way did King Arthur remind the narrator of John Curgenven, particularly with reference to the description of Arthur's face?
- **Expected Ground Truth Answer**: King Arthur reminded the narrator of John Curgenven because King Arthur was described as having a face like the stroke-oar, which was the name given to John Curgenven.
- **Evidence / Triples**: (King Arthur,had a face like,the stroke-oar); (the stroke-oar,was the name of,John Curgenven)

#### 4. In the narrative of 'An Unsentimental Journey through Cornwall', what is King Arthur's connection to Tintagel, and how is Tintagel described in relation to his legendary birth?
- **Expected Ground Truth Answer**: Tintagel is said to be the birthplace of King Arthur, and he is associated with Tintagel.
- **Evidence / Triples**: (Tintagel,is the birth-place of,King Arthur); (King Arthur,is associated with,Tintagel)

#### 5. In 'An Unsentimental Journey through Cornwall', why might Princess Frederica of Hanover be expected to visit St. Michael's Mount, particularly in connection with her visit to the St. Aubyns who reside there?
- **Expected Ground Truth Answer**: Because Princess Frederica of Hanover visited the St. Aubyns at St. Michael's Mount.
- **Evidence / Triples**: (Princess Frederica of Hanover, visited, St. Aubyns at St. Michael's Mount); (St. Aubyns, live at, St. Michael's Mount)

#### 6. How does the narrator in 'An Unsentimental Journey through Cornwall' compare Mont St. Michel in Normandy to St. Michael's Mount in Cornwall, and what similarities are noted between the two locations?
- **Expected Ground Truth Answer**: Mont St. Michel is similar to St. Michael's Mount.
- **Evidence / Triples**: (Mont St. Michel, is similar to, St. Michael's Mount); (St. Aubyns, live at, St. Michael's Mount)

#### 7. What was Mary Mundy's relationship or attitude toward the Professor, as depicted during the narrator's visit to Mullion in 'An Unsentimental Journey through Cornwall'?
- **Expected Ground Truth Answer**: Mary Mundy admired the Professor and sends her duty to him.
- **Evidence / Triples**: (Mary Mundy, admired, the Professor); (Mary Mundy, sends her duty to, the Professor)

#### 8. In the context of the narrator's travels in 'An Unsentimental Journey through Cornwall', how is Charles, the driver, associated with Mullion, and what role does he play in taking others to this location?
- **Expected Ground Truth Answer**: Charles would take others to Mullion.
- **Evidence / Triples**: (Charles, would take to, Mullion); (Thomas Flavel, was a reverend gentleman at, Mullion)

#### 9. What is the relationship between St. Michael's Mount and Marazion?
- **Expected Ground Truth Answer**: St. Michael's Mount was opposite Marazion.
- **Evidence / Triples**: (St. Michael's Mount,was opposite,Marazion); (Marazion,is in,Cornwall)

#### 10. How is John Curgenven, identified by the narrator as a Cornish boatman and stroke-oar, associated with the Lizard coast in 'An Unsentimental Journey through Cornwall'?
- **Expected Ground Truth Answer**: John Curgenven rows on the Lizard coast and is a Cornish boatman.
- **Evidence / Triples**: (John Curgenven, rows on, Lizard coast); (John Curgenven, is a, Cornish boatman)

#### 11. In the travel narrative 'An Unsentimental Journey through Cornwall', how is the Devil's Frying-pan geographically related to the village of Cadgwith?
- **Expected Ground Truth Answer**: The Devil's Frying-pan is near Cadgwith.
- **Evidence / Triples**: (Devil's Frying-pan, is near, Cadgwith); (Cadgwith, is in, Cornwall)

#### 12. According to the discussion of Arthurian legend in 'An Unsentimental Journey through Cornwall', what is the connection between King Arthur and Excalibur, and what is said about Excalibur's fate involving Dozmare Pool?
- **Expected Ground Truth Answer**: King Arthur had Excalibur, which was thrown into Dozmare Pool.
- **Evidence / Triples**: (King Arthur,had,Excalibur); (Excalibur,was thrown into,Dozmare Pool)

#### 13. In the narrator's description of the Lizard in Cornwall, how is the sea characterized in relation to this coastal area, particularly regarding its frequent roughness?
- **Expected Ground Truth Answer**: The sea was often rough at the Lizard.
- **Evidence / Triples**: (the sea, was often rough at, the Lizard); (Lizard, is in, Cornwall)

#### 14. What is the relationship between St. Rumon and Goonhilly Down as described in 'An Unsentimental Journey through Cornwall', including his activities of settling and building a cell and oratory there?
- **Expected Ground Truth Answer**: St. Rumon settled in Goonhilly Down and made a cell and oratory there.
- **Evidence / Triples**: (St. Rumon,settled in,Goonhilly Down); (St. Rumon,made a cell and oratory in,Goonhilly Down)

#### 15. How does 'An Unsentimental Journey through Cornwall' describe the association between King Arthur and Lyonesse, and what is said about the legendary location of Lyonesse off the coast of Cornwall?
- **Expected Ground Truth Answer**: King Arthur is associated with Lyonesse, which is said to be located off Cornwall.
- **Evidence / Triples**: (King Arthur,is associated with,Lyonesse); (Lyonesse,is said to be located off,Cornwall)

---

## 3. AI Engineering & Portfolio Benchmark Questions

### AI Architecture & Systems Portfolio

#### 1. What published research did Dilip work on with MoES funding?
- **Expected Ground Truth Answer**: Focal-CBAM Fish-YOLO: Attention-Enhanced Deep Learning for Underwater Object Detection, published on IEEE Xplore and presented at ICASA, funded by the Ministry of Earth Sciences.
- **Evidence / Triples**: Dilip conducted research funded by MoES on novel deep neural architectures published in IEEE Xplore.

#### 2. How does Nexora AI achieve sub-180ms p95 latency with high faithfulness?
- **Expected Ground Truth Answer**: By integrating Upstash Redis sub-millisecond semantic caching, parallel hybrid retrieval across Neo4j and Pinecone, AST validation guardrails, and a 3-tier LLM failover ladder (Groq -> OpenRouter -> NVIDIA NIM).
- **Evidence / Triples**: Multi-agent RAG architecture with LangGraph stateful loops.

#### 3. What hardware and quantization techniques are used in the Edge AI object detection system?
- **Expected Ground Truth Answer**: INT8 post-training quantization on Xilinx FPGA (13 FPS) and FP32 on NVIDIA Jetson Orin (45 FPS) running YOLOv8n and an on-device local quantized LLaMA 1B model.
- **Evidence / Triples**: FPGA and Jetson Orin embedded vision engine.

# AWS Integration Proposal for Predict My Glucose (PMRF)

## Goal

Use AWS to turn our existing **Personalized Metabolic Response Function
(PMRF)** into a secure, explainable, production-ready AI application
**without replacing the core prediction model**.

Our core challenge remains:

> **Can seven days of multimodal wearable and meal data teach an
> algorithm enough about an individual to predict how that person will
> respond to a new meal?**

The proposed AWS integration adds a second product-level question:

> **How can we turn that personalized prediction model into a scalable,
> explainable, and responsible AI application?**

------------------------------------------------------------------------

## 1. What We Already Have

The current PMRF pipeline already performs the main predictive task.

### Inputs

-   Meal photo
-   Recent CGM history
-   Heart rate
-   Medication information, when available
-   Days 1--7 personal history

### Prediction pipeline

-   **MobileCLIP-S2** for meal-image representation
-   Nutrition/photo feature estimation
-   **Personalized LightGBM**
-   **In-context transformer**
-   Ensemble prediction
-   TreeSHAP / similar-meal explanations
-   Uncertainty estimation

### Outputs

-   Glucose at 30, 60, 90, and 120 minutes
-   Full predicted glucose trajectory
-   Peak glucose
-   Peak rise
-   Time to peak
-   0--120 min iAUC
-   80% prediction interval
-   Probability of high glucose peaks
-   Important contributing factors
-   Similar past meals
-   Personalized what-if scenarios

**Key principle:** AWS should support deployment, orchestration,
explanation, safety, and scalability. We should **not replace the
existing PMRF prediction model with an LLM**.

------------------------------------------------------------------------

## 2. Proposed AWS Architecture

``` text
                    Predict My Glucose

                         User / Web App
                               |
                  Meal photo + recent context
                               |
                               v
                       Amazon API Gateway
                               |
                               v
                       Lambda / Backend API
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
       Meal Images       Personal History     Recent Data
       Amazon S3          S3 / Database       CGM / HR
             |                 |                 |
             +-----------------+-----------------+
                               |
                               v
                       PMRF Prediction API
                    ECS / SageMaker Endpoint
                               |
              +----------------+----------------+
              |                |                |
              v                v                v
         MobileCLIP         LightGBM       Transformer
        Meal Features      Personalized      Time Series
                              Model
              +----------------+----------------+
                               |
                               v
                    Personalized Prediction
                  Curve / Peak / iAUC / Range
                               |
                  +------------+------------+
                  |                         |
                  v                         v
           Amazon Bedrock             SHAP + Similar
          Explanation Layer             Meals
                  |                         |
                  +------------+------------+
                               |
                               v
                    Bedrock Guardrails
                               |
                               v
                     Patient-Facing UI
               Prediction + Why + What-if
```

------------------------------------------------------------------------

## 3. AWS Components

### A. Amazon S3 --- Multimodal Data Storage

S3 can store:

-   Meal photos
-   CGM time-series files
-   Heart-rate data
-   Medication history
-   User history from Days 1--7
-   Model outputs and artifacts

Example structure:

``` text
s3://predict-my-glucose/
|
+-- users/
    +-- 001/
        +-- history/
        |   +-- cgm.csv
        |   +-- heart_rate.csv
        |   +-- medication.csv
        |
        +-- meals/
            +-- day1/
            +-- day2/
            +-- ...
            +-- day8/
```

This maps naturally to the current PMRF workflow.

------------------------------------------------------------------------

### B. API Gateway + Backend

Our technical design already defines three useful application endpoints:

``` text
POST /v1/people/{id}/history
POST /v1/people/{id}/predict
GET  /v1/people/{id}/profile
```

Possible AWS implementation:

``` text
Web App
   |
   v
API Gateway
   |
   v
Lambda / FastAPI Backend
   |
   v
PMRF Prediction Service
```

`/history` uploads the first-week data and builds the user's personalization context; `/predict` generates the personalized meal-response prediction; and `/profile` returns the personalized metabolic profile and diet insights. **The current PMRF design does not require training a new LightGBM model for each user.** Personalization comes from the first-week profile, retrieval of similar personal meals, and the transformer's in-context use of prior meal-response pairs. This makes deployment closer to inference + feature/profile preparation than to per-user model training.

------------------------------------------------------------------------

### C. PMRF Model Hosting --- ECS or SageMaker

The existing PMRF predictor should remain the core prediction engine.

Possible deployment:

``` text
PMRF Python Model
      |
      v
Docker Container
      |
      v
Amazon ECR
      |
      v
ECS / Fargate
      OR
SageMaker Endpoint
```

For a hackathon MVP, **ECS/Fargate or a simple containerized API may be sufficient**. The current prototype can run inference on CPU, so a GPU should not be required for the core PMRF path. SageMaker becomes more useful if we want managed model endpoints, model monitoring, or a more complete MLOps story. A key mentor question is whether the operational value of SageMaker justifies the added setup for a short hackathon.

### D. Privacy and Data Minimization

For the hackathon, use only synthetic or publicly available de-identified data. Encrypt objects stored in S3, use authenticated API access, and minimize what is sent to the generative layer. Where possible, Bedrock should receive **structured PMRF outputs, derived features, and retrieved evidence rather than raw longitudinal health records or raw meal images**. This keeps the LLM focused on explanation while reducing unnecessary exposure of sensitive data.

------------------------------------------------------------------------

## 4. Amazon Bedrock --- Explanation Layer

Bedrock should **not predict glucose directly**.

Instead, the PMRF model first produces structured numerical predictions
and explanation features.

Example:

``` text
Peak rise: +42 mg/dL

Contributing factors:
High carbohydrate content        +18 mg/dL
Personal carbohydrate sensitivity +11 mg/dL
Elevated baseline glucose          +7 mg/dL
Recent activity                    -4 mg/dL
```

These structured results can be passed to a Bedrock-hosted model to
generate a user-friendly explanation:

> Your glucose is predicted to rise approximately 42 mg/dL after this
> meal. The meal's carbohydrate content is the largest contributor.
> Based on your first week of data, you also appear to have a
> stronger-than-average response to carbohydrate-rich meals.

This creates a useful separation:

``` text
PMRF
Predictive AI
"What will happen?"
       |
       v
Amazon Bedrock
Generative AI
"How do we explain it?"
```

This keeps the medically relevant numerical prediction grounded in our
trained model while using generative AI for communication.

------------------------------------------------------------------------

## 5. Amazon Bedrock Guardrails --- Responsible AI

This is especially relevant because our application is health-related.

Bedrock Guardrails should be configured **at the same time as the Bedrock explanation layer**, rather than added at the end. They can help prevent the generative explanation layer from producing unsupported medical claims or inappropriate recommendations.

For example, the system should avoid outputs such as:

> "You definitely have diabetes."

or

> "Stop taking your medication."

Instead, the application should communicate uncertainty and clearly
distinguish predictive insights from medical advice.

Proposed flow:

``` text
PMRF Prediction
      |
      v
Bedrock Explanation
      |
      v
Bedrock Guardrails
      |
      v
Safe User-Facing Response
```

This strengthens the project's **Responsible AI** story.

------------------------------------------------------------------------

## 6. Medical Knowledge–Grounded Interpretation & Meal-Level GI/GL Estimation

Explainability should be a central feature of the application rather than an add-on. In addition to explaining which model features contributed to a prediction, we can connect the predicted glucose response to curated medical and nutritional evidence while explicitly communicating uncertainty.

### A. Medical Knowledge–Grounded Interpretation

Build a curated medical knowledge base using peer-reviewed literature, validated clinical references, CGM research, project methodology, and model limitations. After PMRF predicts an individual's postprandial glucose response, the system can extract clinically meaningful CGM response features and retrieve relevant evidence to provide **possible physiological interpretations**.

``` text
PMRF Prediction
      |
      v
Predicted Glucose Response
Trajectory / Peak / iAUC / Variability
      |
      v
Extract CGM Response Features
      |
      v
Amazon Bedrock Knowledge Base / RAG
      |
      v
Evidence-Grounded Interpretation
      |
      v
Evidence Support / Grounding Score
      |
      v
User Report + Supporting Citations
```

The report could discuss patterns such as unusually high postprandial excursions, prolonged glucose elevation, delayed recovery, or high glycemic variability. These outputs should be framed as **model-based interpretations rather than clinical diagnoses**. The explanation should not report an LLM-generated self-confidence score. Instead, we should expose an **evidence-support / grounding score** based on how well the generated explanation is supported by the PMRF outputs and retrieved references, alongside the PMRF's own predictive uncertainty.

CGM-derived phenotyping approaches, such as published work on *glucotypes* and patterns of glucose dysregulation, could also be explored to characterize an individual's glucose-response phenotype. This should be presented as exploratory metabolic characterization, not as a tool for diagnosing or assigning a diabetes stage.

### B. Meal-Level Glycemic Index (GI) and Glycemic Load (GL) Estimation

Extend the existing meal-image workflow so that it estimates not only food identity and macronutrients, but also the overall glycemic characteristics of the meal.

``` text
Meal Image
     |
     v
Food Recognition
     |
     v
Food Segmentation + Portion Estimation
     |
     v
Estimated Available Carbohydrate per Food
     |
     v
Validated GI Database Lookup
     |
     v
Food-Level GI + GL
     |
     v
Meal-Level Weighted GI + Total GL
     |
     v
Explanation Layer / User Report
```

The system could reference validated resources such as international GI tables to estimate the GI of carbohydrate-containing foods and calculate approximate food-level and meal-level glycemic load from estimated portions and available carbohydrate. These values should be reported as estimates because image-based food identification, portion estimation, preparation method, mixed-meal effects, and GI-table matching all introduce uncertainty. **For the hackathon MVP, GI/GL should remain explanation-only and should not feed back into PMRF as a predictive feature.** If we later want GI/GL to become a model input, the model should be retrained and revalidated with that feature explicitly included.

### C. Combined Explainability Workflow

The two additions can be integrated with the existing SHAP and similar-meal explanations:

``` text
                    Meal Image
                        |
                        v
          Food + Portion Recognition
                        |
                        v
        Nutrition Estimation
                        |
                        v
                    PMRF Model
                        |
                        v
        Personalized CGM Prediction
                        |
       +----------------+----------------+
       |                                 |
       v                                 v
Model Explainability              Medical Knowledge Base
SHAP / Similar Meals              Literature / CGM Evidence
       |                                 |
       +----------------+----------------+
                        |
                        v
           Evidence-Grounded Explanation
                        |
                        v
      Evidence Support / Grounding Score
                        |
                        v
        User Report + Supporting Citations
                        ^
                        |
       GI/GL Estimate (explanation-only)
```

The resulting user experience should answer three questions:

1. **What is predicted to happen?** — personalized glucose trajectory, peak, iAUC, and uncertainty.
2. **Why is it predicted?** — meal composition, estimated GI/GL, SHAP factors, similar meals, and personal metabolic context.
3. **What may explain the pattern physiologically, and how well is that explanation supported?** — evidence-grounded interpretation with citations plus an evidence-support / grounding signal. Predictive uncertainty remains a separate PMRF output.

This creates a stronger explainability story by connecting **food → glycemic characteristics → personal context → predicted response → evidence-grounded interpretation**.

------------------------------------------------------------------------

## 7. Optional: Additional Bedrock Knowledge Base / RAG Interactions

If time permits, we can add a small curated knowledge base containing:

-   Project methodology
-   CGM interpretation documentation
-   Relevant nutrition literature
-   Model limitations
-   Approved health-information resources

Then a question such as:

> "Why might adding protein change my glucose response?"

could follow:

``` text
User Question
      |
      v
Bedrock Knowledge Base
      |
      v
Retrieve Relevant Evidence
      |
      v
LLM Explanation
      |
      v
Answer + Citation
```

Additional conversational RAG features are **Phase 2**. The core medical knowledge-grounded interpretation can be implemented first with a small, curated evidence set.

------------------------------------------------------------------------

## 8. Kiro for Development

Kiro would be a **development tool**, not part of the deployed
prediction architecture.

We can use Kiro's spec-driven development workflow to turn our existing
requirements and API contract into implementation tasks:

``` text
PMRF Technical Report
        |
        v
API Specification
        |
        v
Kiro
        |
        v
Requirements
        |
        v
Design
        |
        v
Tasks
        |
        v
Implementation + Tests
```

Good Kiro tasks for our project could include:

-   FastAPI backend
-   AWS S3 integration
-   API Gateway integration
-   Docker configuration
-   Bedrock explanation service
-   Guardrail integration
-   Unit/integration tests
-   Frontend/backend API integration

------------------------------------------------------------------------

## 9. Recommended Hackathon MVP

We should avoid adding AWS services only for the sake of having more AWS
logos.

The first version can stay relatively simple:

``` text
                    Web App
                       |
                       v
                 API Gateway
                       |
                       v
                 Backend API
                  /         \
                 v           v
            Amazon S3      PMRF Model
           Meal / Data     Prediction
                              |
                              v
                       Amazon Bedrock
                        Explanation
                              |
                              v
                      Bedrock Guardrails
                              |
                              v
                       Prediction UI
```

### Implementation Priority

**Priority 1 --- Core** 1. Store meal photos/data in S3 2. Wrap the
existing PMRF predictor as an API 3. Connect the frontend to the
prediction API

**Priority 2 --- Explainability & Responsible AI** 4. Add Bedrock-generated explanations **together with Bedrock Guardrails** 5. Add a small curated medical knowledge base for evidence-grounded interpretation 6. Add citations and an evidence-support / grounding signal

**Priority 3 --- If Time Permits** 7. Add food-level and meal-level GI/GL estimation as an **explanation-only** feature 8. Expand conversational RAG 9. SageMaker/MLOps 10. More advanced agent workflows

------------------------------------------------------------------------

## 10. Product Story

The architecture gives us three complementary AI layers:

### Predictive AI

**PMRF**

> What will this meal do to **my** glucose?

### Generative AI

**Amazon Bedrock**

> Why is this response predicted, and how can the result be explained
> clearly?

### Responsible AI

**Bedrock Guardrails + PMRF uncertainty**

> How can we communicate the result safely and transparently?

This is stronger than simply saying that we "used AWS."

------------------------------------------------------------------------

## 11. Proposed Demo Flow

A clean demo could look like this:

### Step 1 --- Personal history

The system has learned from the user's first seven days of:

-   CGM
-   meals
-   meal photos
-   heart rate
-   medication/context

### Step 2 --- New meal

The user uploads a Day 8 meal photo.

### Step 3 --- PMRF prediction

The model predicts:

``` text
30 min       146 mg/dL
60 min       161 mg/dL
90 min       153 mg/dL
120 min      139 mg/dL

Peak          164 mg/dL
Peak rise     +47 mg/dL
Time to peak   52 min
80% interval   Displayed in UI
```

The UI also displays the predicted trajectory and uncertainty band.

### Step 4 --- Personalized and evidence-grounded explanation

Bedrock combines PMRF/SHAP output, similar meals, and retrieved medical evidence to produce a concise explanation of the major factors and plausible physiological interpretation. The UI should display supporting citations and an **evidence-support / grounding signal**. This is separate from the PMRF 80% prediction interval, which communicates predictive uncertainty.

### Step 5 --- Meal GI/GL and What-if

If time permits, the UI can show estimated meal-level GI/GL as **explanation-only context** and allow the user to compare scenarios such as:

-   As photographed
-   Half the carbohydrates
-   Add protein
-   Add fiber
-   Double portion

### Step 6 --- Safety

Guardrails keep the explanation within the scope of decision support and
prevent unsupported diagnostic or medication advice.

------------------------------------------------------------------------

## 12. Why AWS Adds Value

AWS is not replacing our machine-learning contribution.

It converts the existing research prototype into a more complete AI
product:

``` text
Research Model
      |
      v
Personalized Prediction
      |
      v
AWS Deployment
      |
      v
Generative Explanation
      |
      v
Responsible AI
      |
      v
Production-Ready Application
```

### Core message

> **Our innovation is the personalized multimodal glucose-response
> model. AWS provides the infrastructure and generative-AI layer needed
> to turn that model into a scalable, explainable, and responsible
> application.**

------------------------------------------------------------------------

## Proposed Next Step

For the first AWS implementation sprint, focus on:

**S3 + PMRF Prediction API + Bedrock Explanation + Bedrock Guardrails**

Once that end-to-end flow works, add a **small curated medical Knowledge Base / RAG layer** for grounded interpretation and citations. Broader conversational RAG remains optional. GI/GL should remain explanation-only for the hackathon and can be cut before the medical RAG if scope becomes tight. SageMaker/MLOps and more advanced agent functionality are later extensions.

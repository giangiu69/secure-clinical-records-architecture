# Secure Relational Database & Multimodal Ingestion Pipeline for Clinical Records

## Project Overview
This repository contains the core architecture of a secure healthcare data management system engineered for **ASS.C.A.** to handle complex clinical records for patients with extensive neuropsychic disabilities. 

The system automates the ingestion of unstructured, multi-format administrative inputs (such as regional health system reports), executes strict data validation and deduplication routines, and stores them into a secured, normalized PostgreSQL database. The output pipeline ensures strict compliance and synchronization with regional healthcare reporting layouts (specifically matching **SPR1** and **SPR2** data standards).

## Tech Stack & Libraries
* **Frontend & State Logic:** React, TypeScript, Vite
* **Database & Backend-as-a-Service:** PostgreSQL, Supabase (PostgREST)
* **UI Framework:** Tailwind CSS, Shadcn/UI
* **Package Management:** Bun / npm
* **Core Utilities:** `lucide-react` (iconography), custom text/data generators

## Data Pipeline Architecture
The system functions as an end-to-end Extract-Transform-Load (ETL) and secure storage infrastructure:

```[Raw Inputs: PDFs / Excels] ──> [PDFImporter / ExcelDropzone]
│
▼
[Regional Flat Files]       <── [Gauss Validation & Verification Layer]
│
▼
[SPR1/SPR2 Text Generator]  <── [Patient Merge & Deduplication Engine]
│
▼
[Secure Client Application] <── [PostgreSQL Database (RLS Policies enforced)]```


1. **Ingestion Layer:** Advanced intake components (`PDFImporter`, `ExcelDropzone`) process unstructured regional files and spreadsheets.
2. **Validation & Deduplication:** Data passes through validation algorithms (`validateForGauss`) and custom merge engines (`patientMerge`) to resolve multi-source synchronization issues and prevent record duplication.
3. **Storage Engine:** Relational tracking using optimized schemas with referential integrity constraints.
4. **Compliance Export Engine:** De-serializes relational data back into verified, split text formats (`generateSPR1File`, `splitSPR2ByCodpres`) matching regional system requirements.

## Key Engineering Challenges Solved

### 1. Deterministic Date Parsing and Timezone Shift Mitigations
* **The Problem:** When parsing historical clinical records, using standard JavaScript date serialization (`new Date().toISOString()`) within client machines operating in UTC+1/UTC+2 (Central European Time/CEST) introduced non-deterministic timezone shifts. This implicitly moved midnight timestamps back by one day, corrupting sensitive medical timelines and clinical validity.
* **The Solution:** Engineered a custom string-splitting Pipeline that bypasses the native JS `Date` constructor during raw data extraction, ensuring database dates are stored as immutable, region-agnostic strings.

### 2. Algorithmic Record Deduplication (`patientMerge`)
* **The Problem:** Ingesting asynchronous medical updates from multiple healthcare sectors led to conflicting or duplicate entries for the same patient across SPR1 and SPR2 record batches.
* **The Solution:** Developed an internal reconciliation engine (`mergeSPR1Records` / `mergeSPR2Records`) that executes cross-field matching metrics, safely merges overlapping clinical logs, and tracks updates deterministically without altering historical data baselines.

### 3. Granular Access Control & RPC Security Hardening
* **The Problem:** By default, certain Remote Procedure Calls (RPC) and custom PostgreSQL functions (like authorization checks) can be exposed to public or anonymous roles in backend-as-a-service layers, introducing severe security vulnerabilities in a healthcare context.
* **The Solution:** Implemented strict Data Control Language (DCL) overrides in the migration pipeline. Explicitly revoked execution rights on identity-checking functions (`is_authorized_user()`) from `PUBLIC` and `anon` roles, restricting execution privileges exclusively to `authenticated` tokens and the internal `service_role`.

### 4. Database Schema Evolution for Regional Interoperability
* **The Problem:** Regional reporting schemas for tracking neuropsychic disabilities change dynamically, requiring field-level updates (such as adjustments to clinical rating scales like `scala_dis` and diagnostic codes like `dis_ingr` in `spr1_records`) without introducing data truncation or downtime.
* **The Solution:** Developed deterministic schema migration scripts using defensive SQL design patterns (`ADD COLUMN IF NOT EXISTS`) and precision tuning for string constraints (e.g., refactoring column definitions like `cittu` fields), ensuring zero-downtime structural updates.

## Getting Started

To explore the frontend interface architecture and database structure locally:

1. Clone the repository:
   ```sh
   git clone [https://github.com/giangiu69/secure-clinical-records-architecture.git](https://github.com/giangiu69/secure-clinical-records-architecture.git)
Install the necessary dependencies:

Bash
npm install
Set up your local environment variables by copying the example file:

Bash
cp .env.example .env
Start the local development server:

Bash
npm run dev
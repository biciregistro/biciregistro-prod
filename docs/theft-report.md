# Bike Theft Management Feature

This document outlines the implementation of the bike theft reporting and recovery feature.

## User Story

**Title:** Bike Theft Status Management (Stolen / Recovered)

**As a:** Cyclist

**I want to:** Have an action button on my bike's card that allows me to report it as "Stolen" if it's safe, or mark it as "Recovered" if it has already been reported.

**So that:** I can keep my bike's status updated on the platform immediately to alert the community or clear the record.

## Acceptance Criteria

### Scenario 1: Reporting a safe bike as stolen

- **Given** I am on my dashboard (e.g., "My Bikes") and I see a bike card with the status "Safe" (or "Registered").
- **Then** I should see a primary action button, red, with the text "Report Stolen".
- **When** I click the "Report Stolen" button.
- **Then** I am directed to the "bike report flow" (either a modal or a new page) to confirm the incident details.
- **And when** I successfully complete the report flow (e.g., I click "Confirm Theft").
- **Then** the status label on that bike's card should change from "Safe" to "Stolen".

### Scenario 2: Action button for an already stolen bike

- **Given** I am on my dashboard and I see a bike card with the status "Stolen".
- **Then** the action button on that card (which was previously "Report Stolen") should change.
- **And** it should display a different text, such as "Mark as Recovered" (and preferably have a different color, e.g., green or blue).

### Scenario 3: Marking a stolen bike as recovered

- **Given** I see my bike's card with the "Stolen" status and the "Mark as Recovered" button.
- **When** I click the "Mark as Recovered" button.
- **Then** the system should initiate a confirmation flow (e.g., a simple modal asking "Are you sure you have recovered this bike?").
- **And when** I successfully complete that flow (e.g., I click "Confirm Recovery").
- **Then** the status label on the card should change from "Stolen" back to "Safe".
- **And** the action button should revert, showing "Report Stolen" again (the red button from Scenario 1).

## Implementation Details

- **Data Model:**
    - The `Bike` model in `src/lib/types.ts` and `src/lib/schemas.ts` has been updated to include a `stolen` boolean field and a `stolenReport` object.
- **Components:**
    - The `BikeCard` component in `src/components/bike-components.tsx` now conditionally renders either a "Report Stolen" or "Mark as Recovered" button based on the `bike.stolen` status.
    - A new `StolenBikeReportForm` component was created in `src/components/bike-components.tsx` to handle the theft report form.
- **Server Actions:**
    - The `reportStolenBike` and `markAsRecovered` functions in `src/lib/actions.ts` handle the logic for updating the bike's status in the database.
- **Database:**
    - The `updateBikeStolenStatus` function in `src/lib/data.ts` updates the bike's `stolen` status and adds or removes the `stolenReport` in Firestore.

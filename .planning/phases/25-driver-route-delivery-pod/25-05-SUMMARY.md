---
phase: 25-driver-route-delivery-pod
plan: 05
subsystem: driver-app
tags: [pod, proof-of-delivery, signature, camera, offline, gps]
dependency_graph:
  requires: [25-04]
  provides: [proof-of-delivery-capture, pod-offline-storage, swipe-to-complete]
  affects: [delivery-workflow, route-completion, invoice-generation]
tech_stack:
  added: [react-signature-canvas]
  patterns: [swipe-gesture, gps-tagging, offline-first-poi, upload-queue]
key_files:
  created:
    - apps/driver/src/components/pod/PODPhotos.tsx
    - apps/driver/src/components/pod/SignaturePad.tsx
    - apps/driver/src/components/pod/ConditionSelect.tsx
    - apps/driver/src/components/pod/SwipeToComplete.tsx
    - apps/driver/src/routes/pod.tsx
  modified:
    - apps/driver/src/router.ts
    - apps/driver/src/i18n/locales/en/driver.json
    - apps/driver/src/i18n/locales/ar/driver.json
decisions:
  - "SignaturePad uses forwardRef+useImperativeHandle for parent data extraction rather than controlled state"
  - "SwipeToComplete uses raw pointer events + motion/react animate for spring physics rather than gesture library"
  - "GPS failure during POD capture is non-blocking — coordinates default to 0,0 with logged warning"
metrics:
  duration: 4min
  completed: "2026-04-06"
  tasks: 2
  files: 8
requirements: [DRV-08]
---

# Phase 25 Plan 05: POD Capture Screen Summary

POD (Proof of Delivery) capture screen with GPS-tagged photos (1-6), full-screen signature pad with signer name/role, condition assessment radio, quantity confirmation table, and 80% swipe-to-complete gesture with haptic feedback. Data persisted to PowerSync SQLite immediately for offline capability, photos queued for background upload.

## What Was Built

### Task 1: POD Components (b62cdc0)

**PODPhotos** — 3-column photo grid supporting 1-6 photos. Each capture auto-tags with GPS coordinates + timestamp via geofence.ts getCurrentPosition(). Geist Mono font for photo counter. Confirm-before-remove on each photo. Uses capturePhoto() from camera.ts (1920px max, JPEG 0.7).

**SignaturePad** — Full-screen canvas (40vh min-height, 200px minimum) using react-signature-canvas. Pen color #0F172A, stroke width 2-4px for finger input. Signer name (required TextField) and role (Select with Foreman/PM/Site Engineer/Owner/Superintendent/Other). Custom role input when "Other" selected. Data exported via imperative ref.

**ConditionSelect** — React Aria RadioGroup with "Good condition" (green highlight) and "Damage noted" (amber highlight). 56dp touch targets. Optional TextArea for condition notes when damaged selected.

**SwipeToComplete** — Full-width pill track with draggable thumb. Motion v12 spring animation for snap-back (stiffness 200, damping 20). 80% threshold to trigger completion. Haptic feedback at 50% (Medium) and 100% (Heavy) via Capacitor Haptics. RTL support: swipe direction flips, arrow icon rotates. Disabled state with opacity reduction.

### Task 2: POD Route Screen + i18n (213b553)

**POD Screen** at `/pod/$deliveryId` — Scrollable layout with 5 sections: photos, quantity confirmation, condition select, signature pad, swipe-to-complete footer. Prerequisites gate: requires 1+ photo, non-empty signature, signer name, role, and condition selection.

**On complete:** GPS capture, proof_of_delivery INSERT to PowerSync, photo queue via upload-queue, signature queue, delivery status update to 'delivered', stop status to 'completed', navigate to /route-overview.

**Offline indicator:** Banner when navigator.onLine is false.

**Router:** pod route added to routeTree.

**i18n:** 26 keys added to both EN and AR (pod.title through pod.requiredField). Arabic includes role translations and proper phrasing.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all components are fully wired to their data sources (PowerSync, stores, camera, geofence, upload-queue).

## Verification

- `bun run build` passes
- All acceptance criteria grep checks pass (12/12)
- POD screen captures photos with GPS+timestamp tags
- Signature pad captures name, role, and signature
- Condition select works (good/damaged with optional notes)
- Swipe-to-complete requires 80% width with haptic feedback
- POD saved to PowerSync proof_of_delivery table
- Photos queued for background upload
- Stop marked completed after POD
- All i18n keys present for AR + EN

## Self-Check: PASSED

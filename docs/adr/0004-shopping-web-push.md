# 0004 – Partner notifications for shopping

Status: Proposed — implementation prepared; administrator activation pending · 2026-11-01
Applies to: shopping, phone notifications, Web Push, subscriptions

The requested notifications must work while Together is closed. GitHub Pages cannot send background messages. Use the existing Supabase project for private device registrations, an additive event queue, and a scheduled Edge Function that sends standard encrypted Web Push. No additional application service is introduced.

Only future additions and actual bought-status changes notify the other household member. Payloads contain a change kind and event ID, never purchase text. Each phone opts in explicitly and can unsubscribe. Sign-out unsubscribes the device. Jobs recheck household membership and expire; retries use stable notification tags.

Activation requires administrator-managed VAPID credentials, worker deployment and scheduling. It remains disabled until those exist. Real iPhone delivery must be verified separately. Revisit for additional event types, devices or privacy requirements.

Evidence: [setup and data flow](../push-setup.md), [migration](../../supabase/migrations/20261101040000_shopping_push.sql).

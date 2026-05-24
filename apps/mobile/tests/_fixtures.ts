/**
 * Re-export de `@playwright/test` pour ne pas casser les 27 .spec.ts qui
 * importent depuis "../_fixtures". L'injection multi-worker a été retirée
 * suite au revert de la parallélisation multi-BDD.
 */
export { test, expect } from "@playwright/test";
export type { Page, Locator, BrowserContext, Browser } from "@playwright/test";

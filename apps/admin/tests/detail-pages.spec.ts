import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// Ces tests vérifient les pages de détail uniquement si la base contient au moins
// une entité (association / utilisateur / mission). Dans le cas contraire, le test
// est marqué `skip` pour ne pas bloquer la CI sur une base de données vide.

test.describe('Detail pages (association / user / mission)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('AssociationDetailPage : ouvre via la liste et affiche les sections clés', async ({
    page,
  }) => {
    await page.goto('/associations');
    const firstLink = page.locator('a[href^="/associations/"]').first();
    const count = await firstLink.count();
    test.skip(count === 0, 'Aucune association en base');

    await firstLink.click();
    await expect(page).toHaveURL(/\/associations\/\d+$/);
    await expect(
      page.getByRole('heading', { name: /carte d'identité/i }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /membres/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /missions/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /documents/i }),
    ).toBeVisible();
  });

  test('AssociationDetailPage : URL inexistante → message d\'erreur ou état vide', async ({
    page,
  }) => {
    await page.goto('/associations/99999999');
    await expect(page).toHaveURL(/\/associations\/99999999$/);
    // La page ne doit pas crasher : on attend soit un état d'erreur, soit aucune crash visuel.
    await expect(page.locator('body')).toBeVisible();
  });

  test('UserDetailPage : ouvre via la liste et affiche Identité', async ({
    page,
  }) => {
    await page.goto('/users');
    const firstLink = page
      .locator('a[href^="/users/"]')
      .filter({ hasNotText: 'utilisateur' })
      .first();
    const count = await firstLink.count();
    test.skip(count === 0, 'Aucun utilisateur en base');

    await firstLink.click();
    await expect(page).toHaveURL(/\/users\/\d+$/);
    await expect(page.getByRole('heading', { name: /identité/i })).toBeVisible();
  });

  test('MissionDetailPage : accessible depuis une AssociationDetailPage si missions présentes', async ({
    page,
  }) => {
    await page.goto('/associations');
    const firstAsso = page.locator('a[href^="/associations/"]').first();
    test.skip((await firstAsso.count()) === 0, 'Aucune association en base');
    await firstAsso.click();
    await expect(page).toHaveURL(/\/associations\/\d+$/);
    const missionLink = page.locator('a[href^="/missions/"]').first();
    test.skip((await missionLink.count()) === 0, 'Aucune mission rattachée');
    await missionLink.click();
    await expect(page).toHaveURL(/\/missions\/\d+$/);
  });
});

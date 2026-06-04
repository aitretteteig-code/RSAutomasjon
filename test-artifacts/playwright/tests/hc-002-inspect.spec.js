const { test, expect } = require('../helpers/agent-test');
const { DEFAULT_STORE_NAME, ensureStoreSelected, loginIfNeeded } = require('../helpers/rs-store');

test.describe('HC-002 inspection', () => {
  test('inspect recipe details controls', async ({ page }) => {
    await loginIfNeeded(page);
    await ensureStoreSelected(page, process.env.RS_STORE_NAME || DEFAULT_STORE_NAME);

    const articleId = process.env.HC002_ARTICLE_ID || '514687';
    await page.goto(`/retailsuite/store/#/articles/article/listwithdetails?id=${articleId}`, {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.getByText(articleId).first()).toBeVisible();
    if (process.env.HC002_SELECT_DECLARATION === '1') {
      await page.evaluate(() => {
        const rows = [...document.querySelectorAll('[ng-click="selectContentDeclaration(item)"]')];
        const row = rows[rows.length - 1];
        if (row) {
          row.scrollIntoView({ block: 'center' });
          row.click();
        }
      });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1500);
    }
    if (process.env.HC002_OPEN_RECIPE_MODAL === '1') {
      await page.getByTitle('Rediger oppskrift').click();
      await expect(page.getByText('Rediger oppskrift')).toBeVisible();
      await page.waitForTimeout(1000);
    }

    const data = await page.evaluate(() => {
      const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const controls = [...document.querySelectorAll('button,a,[ng-click]')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            text: normalize(el.innerText || el.value || el.title || el.getAttribute('aria-label')),
            tag: el.tagName,
            ngClick: el.getAttribute('ng-click') || '',
            title: el.getAttribute('title') || '',
            x: Math.round(r.x),
            y: Math.round(r.y),
            w: Math.round(r.width),
            h: Math.round(r.height),
            visible: r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none'
          };
        })
        .filter((item) => item.visible && /Rediger|Oppskrift|Produksjon|Næring|Prissetting|createProduction|save|recipe/i.test(`${item.text} ${item.ngClick} ${item.title}`));
      const bodyText = normalize(document.body.innerText);
      const modal = [...document.querySelectorAll('.modal-content, .modal-dialog')]
        .filter((element) => {
          const r = element.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .pop();
      const modalScopes = modal
        ? [modal, ...modal.querySelectorAll('*')].map((element, index) => {
            const scope = angular.element(element).scope();
            const isolateScope = angular.element(element).isolateScope && angular.element(element).isolateScope();
            const summarize = (candidate) => candidate ? {
              keys: Object.keys(candidate).filter((key) => !key.startsWith('$')).slice(0, 30),
              hasRecipe: !!candidate.recipe,
              hasAddIngredient: typeof candidate.addIngredient === 'function',
              hasRemoveIngredient: typeof candidate.removeIngredient === 'function',
              hasSave: typeof candidate.save === 'function',
              recipeCount: candidate.recipe && candidate.recipe.ingredients ? candidate.recipe.ingredients.length : null
            } : null;
            return {
              index,
              tag: element.tagName,
              cls: element.className || '',
              text: normalize(element.innerText).slice(0, 80),
              scope: summarize(scope),
              isolateScope: summarize(isolateScope)
            };
          }).filter((item) =>
            (item.scope && (item.scope.keys.length || item.scope.hasRecipe || item.scope.hasAddIngredient))
            || (item.isolateScope && (item.isolateScope.keys.length || item.isolateScope.hasRecipe || item.isolateScope.hasAddIngredient))
          ).slice(0, 80)
        : [];
      const oppskriftPositions = [];
      let ix = bodyText.indexOf('Oppskrift');
      while (ix >= 0 && oppskriftPositions.length < 10) {
        oppskriftPositions.push({
          index: ix,
          around: bodyText.slice(Math.max(0, ix - 120), ix + 300)
        });
        ix = bodyText.indexOf('Oppskrift', ix + 1);
      }
      return {
        url: location.href,
        title: document.title,
        hasOppskrift: bodyText.includes('Oppskrift'),
        oppskriftIndex: bodyText.indexOf('Oppskrift'),
        bodyAroundOppskrift: bodyText.includes('Oppskrift')
          ? bodyText.slice(Math.max(0, bodyText.indexOf('Oppskrift') - 300), bodyText.indexOf('Oppskrift') + 700)
          : '',
        oppskriftPositions,
        modalScopes,
        controls
      };
    });

    console.log(`HC-002-INSPECT ${JSON.stringify(data, null, 2)}`);
  });
});

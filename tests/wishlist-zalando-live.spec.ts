import { expect, test } from '@playwright/test';
import { pocDamian, pocMasha, pocPassword, transport } from './helpers/sharedTransport';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
test('real Zalando product lookup',async({page,context})=>{
 test.skip(process.env.TEST_LIVE_PRODUCT !== '1', 'Requires a live third-party product page.');
 test.setTimeout(60000); await transport().attach(context);
 await context.route('**/rest/v1/household_member_profiles?*',route=>route.fulfill({json:[{user_id:pocMasha,display_name:'Masha'},{user_id:pocDamian,display_name:'Damian'}]}));
 await context.route('**/rest/v1/wish_gift_plans*',route=>route.fulfill({json:[]}));
 await context.route('**/rest/v1/folder_entries*',route=>route.request().method()==='GET' && new URL(route.request().url()).searchParams.get('kind')==='eq.wish' ? route.fulfill({json:[]}) : route.fallback());
 await page.goto('./'); await page.getByRole('button',{name:'Masha',exact:true}).click(); await page.getByLabel('Password',{exact:true}).fill(pocPassword);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Us',exact:true}).click(); await page.getByRole('button',{name:/Wishlist/}).click();await page.getByRole('button',{name:'+ Add wish'}).click();
 await page.getByLabel('Product link (optional)').fill('https://en.zalando.de/aldo-aldo-shoulder-bag-lazarosluxe-tote-bag-brown-white-a0151h249-o11.html');
 await expect(page.getByLabel('Wish name')).not.toHaveValue('',{timeout:30000});await expect(page.getByLabel('Estimated price (optional)')).not.toHaveValue('',{timeout:30000});await expect(page.getByAltText('Selected wish')).toBeVisible({timeout:30000});
 console.log('EXTRACTED',JSON.stringify({title:await page.getByLabel('Wish name').inputValue(),price:await page.getByLabel('Estimated price (optional)').inputValue(),currency:await page.getByLabel('Currency').inputValue(),store:await page.getByLabel('Store (optional)').inputValue(),photo:(await page.getByAltText('Selected wish').getAttribute('src'))?.slice(0,30)}));
 await page.getByRole('button', { name: 'Save wish' }).click();
 await page.getByRole('button', { name: /ALDO SHOULDER BAG LAZAROSLUXE/ }).click();
 await expect(page.getByRole('link', { name: 'View in store' })).toHaveAttribute('href', 'https://en.zalando.de/aldo-aldo-shoulder-bag-lazarosluxe-tote-bag-brown-white-a0151h249-o11.html');
});

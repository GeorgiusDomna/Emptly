import { expect, test } from "@playwright/test";

test("two users can chat and third user is rejected", async ({ browser, page }) => {
	await page.goto("/create-room/");

	const inviteLink = await page.locator('input[readonly]').inputValue();
	await expect(inviteLink).toContain("/room/");

	await page.getByRole("button", { name: "Войти в комнату" }).click();
	await expect(page.getByText("Вы в комнате. Ожидаем второго участника.")).toBeVisible();

	const secondContext = await browser.newContext();
	const secondPage = await secondContext.newPage();
	await secondPage.goto(inviteLink);

	await expect(secondPage.getByText("Собеседник в комнате. Канал защищен.")).toBeVisible();
	await expect(page.getByText("Собеседник в комнате. Канал защищен.")).toBeVisible();

	const messageFromFirst = `ping-${Date.now()}`;
	await page.locator("#room-message-input").fill(messageFromFirst);
	await page.locator("#room-message-input").press("Enter");
	await expect(secondPage.getByText(messageFromFirst)).toBeVisible();

	const thirdContext = await browser.newContext();
	const thirdPage = await thirdContext.newPage();
	await thirdPage.goto(inviteLink);
	await expect(thirdPage.getByText("Комната уже занята двумя пользователями.")).toBeVisible();

	await secondContext.close();
	await thirdContext.close();
});

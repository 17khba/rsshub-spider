const puppeteer = require('puppeteer');
const fs = require('fs');

async function getRssList() {
	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	async function getRssBySelector(h2El) {
		await sleep(1000);
		const pageElement = document.querySelector('.page')
		const h3Elements = pageElement.querySelectorAll(`h3[id^="${h2El.id}"]`)
		const links = Array.from(h3Elements).map(h3El => {
			const link = h3El.nextElementSibling.querySelector('.example > a')
			const hrefData = link ? link.getAttribute('href') : ''
			return hrefData
		})
		const h2Content = h2El.textContent
		const title = h2Content ? h2Content.replace(/^# /, '').trim() : ''
		return {
			title,
			links,
		}
	}
	const pageElement = document.querySelector('.page')
	const h2Elements = pageElement.querySelectorAll('.content__default > h2')
	const data = Array.from(h2Elements).map(getRssBySelector)
	return await Promise.all(data)
}

(async () => {
	const browser = await puppeteer.launch({
		headless: false,
		devtools: true,
		timeout: 0,
	})
	const page = await browser.newPage()

	await page.goto('https://docs.rsshub.app', { waitUntil: "networkidle0" })
	await page.waitForSelector('aside > ul > li:nth-child(2) > section > ul')
	const rssTagList = await page.$$('aside > ul > li:nth-child(2) > section > ul a')

	const result = []
	for (const tag of rssTagList) {
		await tag.click()
		await page.waitForNavigation({ waitUntil: "domcontentloaded" })
		await page.waitForTimeout(1000)
		const title = await page.evaluate(tag => tag.textContent, tag)
		const rssListFragment = await page.evaluate(getRssList)
		result.push({
			title,
			data: rssListFragment
		})
	}

	fs.writeFile('rss-detail.json', JSON.stringify(result, undefined, 2), err => {
		if (err) console.error('write file failed', err)
	})
	await browser.close()
})()

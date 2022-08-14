require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let section = {};

let order = require('./sections/index.json');
for(const item of order) {
	section[item['key']] = require(`./sections/${item['key']}.json`);
}

let datestr = new Date().toISOString().split('T')[0];

async function assemble() {
	for(let [idx, sect] of order.entries()) {
		const payload = section[sect['key']];
		payload.description = payload.description.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() + "\n\u200b"; // patch description line endings
		if(!payload.fields[0].name) {
			payload.fields.shift();
		}
		payload.footer = {
			"text":"Last updated: "+datestr+". Please let us know if you have any suggestions!"
		};
		payload.color = parseInt(sect['color'].substring(1), 16);
		payload.timestamp = null;
		const wrappedPayload = {
			embeds: [payload],
			components: [{
					type: 1,
					components: [{
						"style": 5,
						"label": "Jump to Navigation",
						"url": `https://discord.com/channels/${process.env.GUILD}/${process.env.CHANNEL}/${linktreeStubId}`,
						"emoji": {
							"id": null,
							"name": "⏫"
						},
						"disabled": false,
						"type": 2
					}]
			}]
		};
		
		if(idx == order.length-1) wrappedPayload.components = null;
		
		let stringed = JSON.stringify(wrappedPayload);
		stringed = stringed.replace(/""/g, `"\u200b"`); // patch empty fields
		
		const resp = await fetch(`https://discord.com/api/webhooks/${process.env.ID}/${process.env.SECRET}?wait=1`, {
			method: "post",
			headers: {
			  'Content-Type': 'application/json',
			},
			body: stringed
		});
		sect.mId = JSON.parse(await resp.text())["id"]
		sect.url = `https://discord.com/channels/${process.env.GUILD}/${process.env.CHANNEL}/${sect.mId}`;
		await new Promise(function(resolve) { setTimeout(resolve, 800); });
	}
}

async function linktree() {
	const payload = {
		"content": "**Navigation**",
		"components": [
			{
				"type": 1,
				"components": []
			},{
				"type": 1,
				"components": []
			},{
				"type": 1,
				"components": [{
					"style": 5,
					"label": "Suggest a Resource",
					"url": "https://jpclass.org/feedback?",
					"disabled": false,
					"emoji": {
						"id": null,
						"name": "📢"
					},
					"type": 2
				}]
			}
		]
	}
	for(const [idx, item] of order.entries()) {
		let emoji = {"id": null, "name": item.emoji};
		if(item.emoji.length > 16) {
			emoji = {"id": ""+item.emoji, "name": "custom"};
		}
		payload.components[Math.min(Math.floor(idx/3), 1)].components.push({
			"style": 5,
			"label": item.title,
			"url": item.url,
			"disabled": false,
			"emoji": emoji,
			"type": 2
		});
	}
	await fetch(`https://discord.com/api/webhooks/${process.env.ID}/${process.env.SECRET}?wait=1`, {
		method: "post",
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload)
	});
	await fetch(`https://discord.com/api/webhooks/${process.env.ID}/${process.env.SECRET}/messages/${linktreeStubId}`, {
		method: "patch",
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload)
	});
}

let linktreeStubId = null;
async function linktreeStub() {
	const payload = {
		"content": "**Navigation**"
	}
	const resp = await fetch(`https://discord.com/api/webhooks/${process.env.ID}/${process.env.SECRET}?wait=1`, {
		method: "post",
		headers: {
		  'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload)
	});
	linktreeStubId = JSON.parse(await resp.text())["id"]
}
	
async function buildAll() {
	await linktreeStub();
	await assemble();
	await linktree();
}

buildAll();
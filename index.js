require("dotenv").config();
const token = process.env.DISCORD_TOKEN;
const master = process.env.CONOHA_MASTER;
const swtoken = process.env.SWBOT_TOKEN;
const swsecret = process.env.SWBOT_SECRET;
const swaircon = process.env.SWBOT_DEVICEID_AIRCON;
const swlight = process.env.SWBOT_DEVICEID_LIGHT;
const swoyasumi = process.env.SWBOT_SCENEID_OYASUMI;

const Discord = require("discord.js");
const intents = [Discord.GatewayIntentBits.MessageContent, Discord.GatewayIntentBits.DirectMessages];
const partials = [Discord.Partials.Channel, Discord.Partials.Message]
const client = new Discord.Client({ intents: intents, partials: partials });

const fetch = require("node-fetch");
const crypto = require("crypto");

client.on("ready", () => {
	console.log("Discordへの接続完了です！:", client.user.tag);
});

client.on("messageCreate", message => {
	if (message.author.bot) return;
	if (message.channel.type !== Discord.ChannelType.DM) return;
	if (message.author.id !== master) return;

	// メッセージ内容で分岐
	if (message.content.includes("もうすぐ帰る")) {
		const replyMsg = "了解です！お部屋の準備してお待ちしてますね！";
		const errorMsg = "了解です！お部屋の準備して……\nあれ？リモコンの電池が切れちゃってるみたいです……。";

		// まずは部屋の明かりをつける
		const body = {
			"command": "調光1", // まあ普通はturnOnでええやろな
			"commandType": "customize"
		}
		const result1 = switchBotApiRequest(`devices/${swlight}/commands`, body);
		if (result1 == false) {
			message.channel.send(errorMsg);
		} else {
			const currentMonth = new Date().getMonth() + 1; // 1月の返り値は0なんですね (1敗)
			if ([1, 2, 3, 11, 12].includes(currentMonth)) {
				// 暖房をつける　
				const body = {
					"command": "setAll",
					"parameter": "24,5,1,on",
				}
				const result2 = switchBotApiRequest(`devices/${swaircon}/commands`, body);
				if (result2 == false) {
					message.channel.send(errorMsg);
				} else message.channel.send(replyMsg);
			} else if ([7, 8, 9].includes(currentMonth)) {
				//　冷房をつける
				const body = {
					"command": "setAll",
					"parameter": "22,2,1,on",
				}
				const result3 = switchBotApiRequest(`devices/${swaircon}/commands`, body);
				if (result3 == false) {
					message.channel.send(errorMsg);
				} else message.channel.send(replyMsg);
			} else message.channel.send(replyMsg);
		}

	} else if (message.content.includes("おやすみ")) {
		// シーンでやってみる
		// ID取るのは…もうv1のAPIで良いんじゃないですか（諦）
		const result = switchBotApiRequest(`scenes/${swoyasumi}/execute`);
		if (result == false) {
			message.channel.send("おやすみなさいです、ごsy…\nあれ？リモコンの電池が切れちゃってるみたいです……。");
		} else message.channel.send("おやすみなさいです、ご主人さま！");
	}
});

function switchBotApiRequest(path, bodyJson = null) {
	const token = swtoken;
	const secret = swsecret;
	const t = Date.now();
	const nonce = crypto.randomUUID();
	const signTerm = crypto.createHmac("sha256", secret)
		.update(Buffer.from(token + t + nonce, "utf-8"))
		.digest();
	const sign = signTerm.toString("base64");

	const headers = {
		"Authorization": token,
		"sign": sign,
		"nonce": nonce,
		"t": t,
		"Content-Type": 'application/json',
	}
	const fetchOpts = {
		method: "POST",
		body: JSON.stringify(bodyJson),
		headers: headers
	}
	fetch(`https://api.switch-bot.com/v1.1/${path}`, fetchOpts).then(res => {
		if (!res.ok) {
			console.error("Fetch failed...");
			return false;
		} else return true;
	})
}

client.login(token);

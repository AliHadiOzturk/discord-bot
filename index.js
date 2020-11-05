
const Discord = require('discord.js');
const { prefix } = require('./config.json');
const ytdl = require('ytdl-core');
const yts = require('yt-search')


const queue = new Map();

const token = process.env.TOKEN;
console.log("TOKEN" + token);
const client = new Discord.Client();
client.login("NzczOTEyNzM5Njg0ODEwNzcy.X6QIZw.GREmUlbBt5JFAJa63qp0LkATzBQ");


client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});


client.on('disconnect', async disconnect => {
    console.log(disconnect)
})

client.on('guildMemberAvailable', async member => {
    console.log(member)
})
client.on('messageUpdate', async message => {
    console.log(message)
})

client.on('userUpdate', async user => {
    console.log(user)
})

client.on('presenceUpdate', async presence => {
    console.log(presence)
})

client.on('message', async message => {
    if (message.author.bot) return;

    if (!message.content.startsWith(prefix)) return;

    // message.channel.send("Çalışıyorum amk");

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}stop`)) {
        stop(message, serverQueue);
        return;
    } else {
        message.channel.send("Bu komutu bilmiyorum ben ^_^");
    }
});

async function execute(message, serverQueue) {

    var str = message.content;
    var command = str.substr(0, str.indexOf(' '))
    const query = str.substr(str.indexOf(' ') + 1);//message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Muzik çalmak istiyon ama bi kanalda değilsin ben sana nasıl hizmet edeyim!"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "Bana kanala girme yetkisi vermemişsin ben nasıl bağlanayım  ? ? ?? ?  ?"
        );
    }
    console.log(query);
    const search = await yts(query);
    const videos = search.videos.splice(0, 1);
    if (!videos)
        return message.channel.send("Aramada bir şey çıkmadı ne aradın sen  ? ? ")

    const songInfo = await ytdl.getInfo(videos[0].url);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);

        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} sıraya eklendi. Ekleyemem sandın di mi 😎`);
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Herhangi bir kanalda olmadan nasıl şarkıyı geçmeye çalışırsın sen 😡"
        );
    if (!serverQueue)
        return message.channel.send("Sırada şarkı bulunmuyor ki sen benle dalga mı geçiyorsun 😡");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Herhangi bir kanalda olmadan nasıl durduracaksın güzel kardeşim anlat bana 😒"
        );
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url, { filter: 'audioonly' }))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Çalmaya başlıyorum. Hazır mısın ? **${song.title}**`);
}

client.login(token);
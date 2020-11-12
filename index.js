
const Discord = require('discord.js');
const { prefix } = require('./config.json');
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const http = require('http');


const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.end("Discord is running!")
});
console.log("PORT : " + process.env.PORT);

server.listen(process.env.PORT | 80);
server.on('listening', () => {
    console.log(`Server is running on ${process.env.PORT | 80} port!`);
})

// server.listen(8080, "127.0.0.1", 0, () => {
//     console.log("Server is running on 8080 port!");
// })

const queue = new Map();

const token = process.env.TOKEN;
console.log("TOKEN" + token);
const client = new Discord.Client();
client.login(token);


client.once('ready', () => {
    console.log('Ready!');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.on('guildMemberAvailable', async member => {
    console.log(member)
})
client.on('messageUpdate', async (message, oldmessage) => {
    console.log("Message updated")
    //console.log(message, oldmessage)
})


client.on('presenceUpdate', async (oldPresence, newPresence) => {
    //console.log(oldPresence, newPresence)
    console.log("Presence Updated")
})

client.on('userUpdate', async (oldUser, newUser) => {
    //console.log(oldUser, newUser)
    console.log("User updated")
})
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.member.user.bot) return;

    if (oldState.channel == newState.channel) return;


    var logChannel;

    if (oldState.channel)
        logChannel = oldState.guild.channels.cache.find(x => x.name == "log");
    else if (newState.channel)
        logChannel = newState.guild.channels.cache.find(x => x.name == "log");

    if (!newState.channel) {
        //logChannel = oldState.guild.channels.cache.find(x => x.name == "log");
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Voice Leave')
            .addFields(
                { name: 'User', value: `<@${oldState.member.user.id}>`, inline: true },
                { name: 'Leave From', value: oldState.channel.name, inline: true },
            )
            // .addField('Inline field title', 'Some value here', true)
            // .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
        // .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
        if (logChannel instanceof Discord.TextChannel) {
            logChannel.send(embed)
        }
    }
    else if (oldState.channel) {
        //logChannel = newState.guild.channels.cache.find(x => x.name == "log");
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Voice Channel Switch')
            .addFields(
                { name: 'User', value: `<@${newState.member.user.id}>`, inline: true },
                { name: 'Old Channel', value: oldState.channel.name, inline: true },
                { name: 'New Channel', value: newState.channel.name, inline: true },
            )
            // .addField('Inline field title', 'Some value here', true)
            // .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
        // .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
        if (logChannel instanceof Discord.TextChannel) {
            logChannel.send(embed)
        }
    }
    else {
        //logChannel = newState.guild.channels.cache.find(x => x.name == "log");
        const embed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Voice Join')
            .addFields(
                { name: 'User', value: `<@${newState.member.user.id}>`, inline: true },
                { name: 'Joined', value: newState.channel.name, inline: true },
            )
            // .addField('Inline field title', 'Some value here', true)
            // .setImage('https://i.imgur.com/wSTFkRM.png')
            .setTimestamp()
        // .setFooter('Some footer text here', 'https://i.imgur.com/wSTFkRM.png');
        if (logChannel instanceof Discord.TextChannel) {
            logChannel.send(embed)
        }
    }

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
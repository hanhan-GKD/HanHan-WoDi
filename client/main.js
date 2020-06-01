const com = require('./com')
const net = require('net');
let CLIENT_SOCKET = {
    client_name: "",
    con: null,
    room_num: 0
};
const config = {
    host: "127.0.0.1",
    port: 3888
}
const Process = async (str) => {
    switch (str) {
        case "c":
            console.log(`——————————————————————————————————————————————`)
            console.log(`请严格按照示例格式录入玩家人数`)
            console.log(`示例:3,2,0`)
            console.log(`3则代表3个平民，2则是2个卧底，0代表0个白板`)
            console.log(`——————————————————————————————————————————————`)
            str = await com.readSyncByRl(`请输入录参与人数:`)
            let players = str.trim().split(",")
            if (players.length < 3) {
                Process("c")
                return
            }
            CLIENT_SOCKET.con.write(JSON.stringify({
                com: "c",
                data: {
                    players,
                    name: CLIENT_SOCKET.client_name
                }
            }))
            break;
        case "i":
            str = await com.readSyncByRl(`请输入房间号:`)
            CLIENT_SOCKET.con.write(JSON.stringify({
                com: "i",
                data: {
                    num: ~~str,
                    name: CLIENT_SOCKET.client_name
                }
            }))
            CLIENT_SOCKET.room_num = ~~str
            break;
        case "s":
            str = await com.readSyncByRl(`轮到【你】发言，请描述你的词语(尽量模糊化)...`)
            CLIENT_SOCKET.con.write(JSON.stringify({
                com: "s",
                data: {
                    room_num: CLIENT_SOCKET.room_num,
                    str
                }
            }))
            break;
        default:
            str = await com.readSyncByRl(`指令输入错误，请重新输入:`)
            await Process(str)
            break;
    }
}

const main = async () => {
    let str = await com.readSyncByRl("请输入入局昵称:")
    // console.log('欢迎来到《憨憨卧底》-命令行版')
    CLIENT_SOCKET.client_name = str + ""
    const server = net.connect(config, async () => {
        CLIENT_SOCKET.con = server
        console.log("连接成功...", config)
        console.log(`——————————————————————————————————————————————`)
        console.log(`————创建房间[c],加入房间[i]————`)
        console.log(`——————————————————————————————————————————————`)
        str = await com.readSyncByRl("请输入:")

        await Process(str)
    })
    server.on("data", async function (buf) {
        let obj = JSON.parse(buf)
        console.log("=============++>", obj)

        switch (obj.com) {
            case "c_ok":
                console.log(`创建房间成功，房间号:${obj.data.home_num}，等待其他玩家进入...`)
                CLIENT_SOCKET.room_num = obj.data.home_num
                break;
            case "i_ok":
                let nameStr = ""
                for (const item of obj.data.clientArr) {
                    nameStr += item.name + ","
                }
                CLIENT_SOCKET.room_num = obj.data.room_num
                console.log(`当前玩家:[${nameStr}]，等待其他玩家进入...`)
                break;
            case "s_ok":
                for (const item of obj.data.players) {
                    console.log(`${item.num}-号,【${item.name}】:`, item.speaks)
                }
                if (CLIENT_SOCKET.client_name == obj.data.speak.name) {
                    await Process("s")
                } else {
                    console.log(obj.msg)
                }
                break;
            case "s_end":
                break;
            default:
                break;
        }
    })
}
main()
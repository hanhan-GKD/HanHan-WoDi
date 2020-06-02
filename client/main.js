const com = require('./com')
const net = require('net');
let CLIENT_SOCKET = {
    client_name: "",
    con: null,
    room_id: null,
    room_num: 0,
    home_ip: null
};
const config = require('../config/index.json')
const Process = async (str) => {
    switch (str) {
        case "a":
            CLIENT_SOCKET.con.write(JSON.stringify({
                com: "a"
            }))
            break;
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
        case "t":
            str = await com.readSyncByRl(`所有玩家发言结束，开始投票，请输入编号:`)
            str = parseInt(str)
            if (str <= 0 || str == NaN) {
                console.log("输入错误，请输入编号:")
                await Process("t")
                break;
            }
            CLIENT_SOCKET.con.write(JSON.stringify({
                com: "t",
                data: {
                    room_num: CLIENT_SOCKET.room_num,
                    num: ~~str
                }
            }))
            break;
        case "is_start":
            str = await com.readSyncByRl(`是否继续？请输入r或e,r:继续,e:退出...`)
            if (["r", "e"].includes(str)) {
                CLIENT_SOCKET.con.write(JSON.stringify({
                    com: str,
                    data: {
                        room_num: CLIENT_SOCKET.room_num
                    }
                }))
            } else {
                console.log("输入错误，请重新输入...")
                Process("is_start")
            }
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
    const server = net.connect(config.client, async () => {
        CLIENT_SOCKET.con = server
        console.log("连接成功...", config.client)
        console.log(`——————————————————————————————————————————————`)
        console.log(`————创建房间[c],加入房间[i],房间列表[a]————`)
        console.log(`——————————————————————————————————————————————`)
        str = await com.readSyncByRl("请输入:")

        await Process(str)
    })
    server.on("data", async function (buf) {
        let obj = JSON.parse(buf)
        switch (obj.com) {
            case "a_ok":
                if (obj.data) {
                    for (const item of obj.data) {
                        console.log(`房间号:${item.home_num},人数:${item.total}/${item.p_num}`)
                    }
                }else{
                    console.log('暂无房间...')
                }
                console.log(`——————————————————————————————————————————————`)
                console.log(`————创建房间[c],加入房间[i],房间列表[a]————`)
                console.log(`——————————————————————————————————————————————`)
                str = await com.readSyncByRl("请输入:")
                await Process(str)
                break;
            case "c_ok":
                console.log(`创建房间成功，房间号:${obj.data.home_num}，等待其他玩家进入...`)
                CLIENT_SOCKET.room_num = obj.data.home_num
                CLIENT_SOCKET.home_ip = obj.data.home_ip
                break;
            case "i_ok":
                let nameStr = ""
                for (const item of obj.data.clientArr) {
                    nameStr += item.name + ","
                }
                CLIENT_SOCKET.room_num = obj.data.home_num
                console.log(`当前玩家:[${nameStr}]，等待其他玩家进入...`)
                break;
            case "s_ok":
            case "s_end":
                for (const item of obj.data.room.clientArr) {
                    if (obj.t_end)
                        console.log(`${item.num}-号,【${item.name}】:`, item.speaks, `票数:${item.vote_num}`)
                    else
                        console.log(`${item.num}-号,【${item.name}】:`, item.speaks)
                }
                if (obj.data.speak && CLIENT_SOCKET.client_name == obj.data.speak.name) {
                    console.log(`我的词语:${obj.data.room.word[obj.data.speak.identity]}`)
                    await Process("s")
                } else {
                    console.log(obj.msg)
                }
                if (obj.com == "s_ok")
                    break;
            case "s_end":
                await Process("t")
                break;
            case "t_end":
                break;
            case "game_end":
                if (CLIENT_SOCKET.home_ip == obj.data.room.home_ip) {
                    await Process("is_start")
                } else {
                    console.log(obj.msg)
                }
                break;
            case "err":
                console.log(obj.msg)
                let err = await com.readSyncByRl("请重新输入:")
                await Process(err)
                break;
            default:
                break;
        }
    })
}
main()
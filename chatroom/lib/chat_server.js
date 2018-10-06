/**
 * 服务器端逻辑
 */
//初始化定义聊天状态的变量
var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

//启动socket.io服务器
exports.listen = function(server) {
	io = socketio.listen(server);//启动socket.io服务器，允许它搭载在已有的http服务器上
	io.set('log level', 1);

	io.sockets.on('connection', function(socket) {//定义每个用户连接的处理逻辑,io.socket时默认(/)命名空间的别名，server.on()为给定事件注册新的处理程序
		guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);//在用户连接上来时，赋予其一个访客名
		joinRoom(socket, 'Iris');//在用户连接上来时把他放入聊天室XXX

		//处理用户的消息，更名，以及聊天室的创建和变更
		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		socket.on('rooms', function(){//用户发出请求时，向其提供已经被占用的聊天室的列表
			socket.emit('rooms', io.sockets.adapter.rooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed);//定义用户断开连接后的清除逻辑
	});
}
/**
 * @method assignGuestName 
 * @description 分配用户昵称
 * @return 
 * @param
 *  */
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
	var name = 'Guest' + guestNumber;//生成新昵称
	nickNames[socket.id] = name;//把用户昵称和客户端连接ID关联上
	socket.emit('nameResult', { //让用户知道他们的昵称
		success: true,
		name: name
	});
	namesUsed.push(name); //存放已经被占用的名称
	return guestNumber + 1; //增加用来生成名称的计数器
}

/**
 * @method joinRoom
 * @description 与进入聊天室相关的逻辑，将用户加入socket.io房间，只要调用socket对象上的join方法
 */
function joinRoom(socket, room){
	socket.join(room);//让用户进入房间
	currentRoom[socket.id] = room;//记录当前的房间
	socket.emit('joinResult', {room: room});//让用户知道他们进入了新的房间
	socket.broadcast.to(room).emit('message', {//让房间里的其他用户知道有新用户进入了房间
		text: nickNames[socket.id] + '加入了房间：' + room + '.' 
	});

	var usersInRoom = io.sockets.clients(room);//确定有哪些用户在房间里
	if (usersInRoom.length > 1) {//如果不止一个用户在这个房间里，汇总下都是谁
		var usersInRoomSummary = 'Users currently in ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', {text: usersInRoomSummary});//将房间里其他用户的汇总发送给这个用户
	}
}

/**
 * @method handleNameChangeAttempts
 * @description 处理昵称变更请求，用户的浏览器通过Socket.IO发送一个请求，并接收表示失败或成功的响应
 *
 */
function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempt', function(name){//添加nameAttempt事件的监听器
		if(name.indexOf('Guest') == 0){//昵称不能以Guest开头
			socket.emit('nameResult', {
				success: false,
				message: '名称不能以"Guest"开头.'
			});
		}else {
			if (namesUsed.indexOf(name) == -1) {//如果昵称还没注册就注册上
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];//删掉之前用户的昵称，让其他用户可以使用

				socket.emit('nameResult', {
					success: true,
					name: name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + '已经更名为： ' + name + '.'
				});	
			} else {
				socket.emit('nameResult', {//如果昵称已经被占用，给客户端发送错误消息
					success: false,
					message: '该名称已被占用。'
				});
			}
		}
	});
}

/**
 * @method [handleMessageBroadcasting]
 * @description 用户发射一个事件，表明消息是从哪个房间发出来的，以及消息的内容是什么；然后服务器将这条消息转发给同一房间的所有用户。
 */
function handleMessageBroadcasting(socket){
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ': ' + message.text
		});
	});
}

/**
 * @method [handleRoomJoining]
 * @description 创建房间
 */
function handleRoomJoining(socket){
	socket.on('join', function(room) {
		socket.leave(currentRoom[socket.id]);//从房间移除客户
		joinRoom(socket, room.newRoom);
	});
}

/**
 * @method handleClientDisconnection
 * @description 用户断开连接，离开聊天程序，从nickNames和namesUsed中移除用户的昵称
 */
function handleClientDisconnection(socket){
	socket.on('disconnect', function() {
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}
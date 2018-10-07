/**
 * 客户端功能： 
 * 1. 客户端向服务器发送用户的消息和昵称/房间变更请求
 * 2. 显示其他用户的消息，以及可用房间的列表(chat_ui.js)
 */
//定义一个JavaScript原型对象，用来处理聊天命令，发送消息，请求变更房间或昵称
var Chat = function(socket) {
	this.socket = socket;
};
//发送聊天信息的函数
Chat.prototype.sendMessage = function(room, text) {
	var message = {
		room: room,
		text: text
	};
	this.socket.emit('message', message);
};
//变更房间的函数
Chat.prototype.changeRoom = function(room) {
	this.socket.emit('join', {
		newRoom: room
	});
};

//处理聊天命令
Chat.prototype.processCommand = function(command) {
	var words = command.split(' ');
	//此处添加逻辑
	var command = words[0]
					.substring(1, words[0].length)
					.toLowerCase();//从第一个单词开始解析命令
	var message = false;

	switch(command) {
		case 'join':
			words.shift();
			var room = words.join(' ');
			this.changeRoom(room);//处理房间的变换/创建
			break;
		case 'nick':
			words.shift();
			var name = words.join(' ');
			this.socket.emit('nameAttempt', name);//处理更名尝试
			break;
		default:
		 	message = '未识别的指令。';
		 	break;
	}
	return message;
};


//在用户界面中显示消息及可用房间
/**
 * @method divEscapedContentElement
 * @description 显示可疑文本
 */
function divEscapedContentElement(message){
	return $('<div></div>').text(message);
}
/**
 * @method divSystemContentElement
 * @description 显示系统创建的受信内容，而不是其他用户创建的
 */

function divSystemContentElement(message){
	return $('<div></div>').html('<i>' + message + '</i>');
}

/**
 * @method processUserInput
 * @description 处理原始的用户输入
 */
function processUserInput(chatApp, socket){
	var message = $('#send-message').val();
	var systemMessage;

	if (message.charAt(0) == '/') {//如果用户输入以/开头，将其作为聊天命令
		systemMessage = chatApp.processCommand(message);
		if (systemMessage) {
			$('#message').append(divSystemContentElement(systemMessage));
		}
	}else {//将非命令输入广播给其他用户
		chatApp.sendMessage($('#room').text(), message);
		$('#message').append(divEscapedContentElement(message));
		$('#message').scrollTop($('#message').prop('scrollHeight'));
	}
	$('#send-message').val(' ');
}

//客户端程序初始化逻辑，在浏览器加载完页面后执行
var socket = io.connect();
$(document).ready(function() {
	var chatApp = new Chat(socket);
	/*console.log('---------------------');
	console.log(socket);
	console.log('---------------------');
*/
	socket.on('nameResult', function(result){//显示更名尝试的结果
		var message;

		if (result.success) {
			message = '您已更名为： ' + result.name + '.';
		}else {
			message = result.message;
		}
		/*console.log('nameResult /nick 以Guest开头的结果：');
		console.log(message);*/
		$('#message').append(divSystemContentElement(message));
		$('#send-message').focus();
	});

	socket.on('joinResult', function(result) {//显示房间变更结果
		console.log('joinResult = ');
		console.log(result);
		
		$('#message').append(divSystemContentElement('Room Changed.'));
		$('#room').text(result.room);
	});

	socket.on('message', function(message) {//显示接收到的消息
		var newElement = $('<div></div>').text(message.text);
		$('#message').append(newElement);
	});

	socket.on('rooms', function(rooms) {
		$('#room-list').empty();
		// console.log('here are all rooms: ');
		// console.log(rooms);
		for (var room in rooms) {
			room = room.substring(1, room.length);
			if (room != '') {
				$('#room-list').append(divEscapedContentElement(room));
			}
		}

		$('#room-list div').click(function() {//点击房间名切换到那个房间
			chatApp.processCommand('/join ' + $(this).text());
			$('#send-message').focus();
		});
	});

	setInterval(function() {//定期请求可用房间列表
		socket.emit('rooms');
	}, 1000);

	$('#send-message').focus();

	$('#send-form').submit(function() {//提交表单可以发送聊天消息
		processUserInput(chatApp, socket);
		return false;
	});
});

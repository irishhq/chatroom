/*
变量声明
*/
var http = require('http');//内置的http模块提供了http服务器和客户端功能
var fs = require('fs');
var path = require('path');//内置的path模块提供了与文件系统路径相关的功能
var mime = require('mime');//附加的mime模块能根据文件扩展名得出MIME类型的能力
var cache = {};//缓存文件内容的对象

/*
1. 发送文件数据及错误响应
*/
/*
description: 文件不存在时发送404错误
*/
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found--by Iris');
	response.end();
}

/*
description: 提供文件数据服务。先写出正确的http头，然后发送文件的内容。
*/
function sendFile(response, filePath, fileContents) {
	response.writeHead(
		200,
		{"Content-Type": mime.getType(path.basename(filePath))}//path.basename()返回文件路径最后一部分，不含分隔符
	);
	response.end(fileContents);
}

/*
description: 提供静态文件服务
			确定文件是否缓存，如果是，就返回它；如果文件未缓存，从硬盘中读取并返回它；
			如果文件不存在，则返回http404错误作为响应。
*/
function serverStatic(response, cache, absPath) {
	if (cache[absPath]) {//检查文件是否缓存在内存中
		sendFile(response, absPath, cache[absPath]);//从内存中返回文件
	} else {
		fs.stat(absPath, function(err, stats) {//检查文件是否存在
			if (stats) {
				fs.readFile(absPath, function(err, data) {//从硬盘中读取文件
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data);//从硬盘中读取文件并返回
					}
				});
			} else {
				send404(response);//发送http404响应
			}
		});
	}
}

/*
2. 创建http服务器
*/
var server = http.createServer(function(request, response) {//创建http服务器，用匿名函数定义对每个请求的处理行为
	var filePath = false;

	if (request.url == '/') {
		filePath = 'public.index.html';//确定默认返回的html文件
	} else {
		filePath = 'public' + request.url;//将url路径转为文件的相对路径
	}

	var absPath = './' + filePath;
	serverStatic(response, cache, absPath);//返回静态文件
});

/*
3. 启动http服务器
*/
server.listen(3000, function() {
	console.log("Server listening on port 3000");
});

/*
4. 设置Socket.IO服务器
*/ 
var chatServer = require('./lib/chat_server');//加载定制的node模块，用于处理基于socket.io的服务端聊天功能。
chatServer.listen(server);//启动socket.io服务器，为其提供一个已经定义好的http服务器，与http共享一个tcp/ip端口
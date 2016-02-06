var socket;
function readyMultiplayer(){
  socket = io();
}

var server = {
  gameStarted: false,
  allowMove: false,
  sendMove: function(vertex){
    socket.emit('move',vertex);
    this.allowMove = false;
  },
  cannotMove: function(){
    socket.emit('forfeit');
    this.allowMove = false;
  },
  addUpdateListener: function(callback){
    socket.on('news', function (data) {
      data = JSON.parse(data);
      console.log('update recived...');
      callback(data);
    });
  },
  addStartGameListener: function(callback){
    var self = this;
    socket.on('startGame',function(data){
      //callback(data.color);
      console.log(data.vertex);
      callback(data.level,data.color,data.vertex); //added level on req
      //vertex = data.vertex;
      self.gameStarted = true;
      self.allowMove = true;
    	console.log("new game started, color:" + data.color);
    });
  },
  addGameOverListener: function(callback){
    socket.on('gameOver',function(){
      callback();
    });
  }
};

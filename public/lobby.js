
document.getElementById('button_play_local').addEventListener('click', function() {
	prepareStage();
	gameType = GAME_TYPE_LOCAL_MULTIPLAYER;
	game();
});

document.getElementById('button_play_online').addEventListener('click', function() {
	prepareStage();
	gameType = GAME_TYPE_MULTIPLAYER;
	readyMultiplayer();
	game();
});

function prepareStage() {
	document.getElementById('canvas').className = 'displayed';
	document.getElementById('lobby').style.visibility = 'hidden';
}

function showLobby() {
	document.getElementById('canvas').className = 'hidden';
	document.getElementById('lobby').style.visibility = 'visible';
}

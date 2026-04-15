  <data:text/html,<<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Cidade Viva Brasil ULTRA</title>

<style>
body { margin:0; background:black; color:white; text-align:center; }
canvas { background:#111; display:block; margin:auto; }

.controls {
  position: fixed;
  bottom: 5px;
  width: 100%;
}

button {
  padding: 8px;
  margin: 2px;
}

#gameOver {
  position: fixed;
  top: 40%;
  width: 100%;
  font-size: 40px;
  display: none;
}
</style>
</head>

<body>

<h3>🇧🇷 Cidade Viva Brasil ULTRA</h3>
<p>
❤️ <span id="life">100</span> |
💰 <span id="money">0</span> |
🚨 <span id="wanted">0</span>
</p>

<div id="gameOver">💀 VOCÊ MORREU</div>

<canvas id="gameCanvas" width="800" height="400"></canvas>

<div class="controls">
<button onclick="moveLeft()">⬅️</button>
<button onclick="moveRight()">➡️</button>
<button onclick="jump()">🦘</button>
<button onclick="shoot()">🔫</button>
<button onclick="steal()">💰</button>
</div>

<script>
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

// MUNDO GRANDE
let worldWidth = 3000;
let cameraX = 0;

// PLAYER
let player = { x:100, y:300, vy:0, life:100 };

// POLÍCIA
let police = [
  {x:800,y:300,siren:false},
  {x:1200,y:300,siren:false}
];

// SISTEMA
let bullets = [];
let money = 0;
let wanted = 0;
let gravity = 0.5;

// LOCAIS
let bank = {x:600,y:270};

// SONS
function playBeep(freq){
  let ctxAudio = new (window.AudioContext||window.webkitAudioContext)();
  let osc = ctxAudio.createOscillator();
  osc.frequency.value = freq;
  osc.connect(ctxAudio.destination);
  osc.start();
  setTimeout(()=>osc.stop(),100);
}

// DESENHAR
function draw(){

  ctx.clearRect(0,0,800,400);

  cameraX = player.x - 400;

  // chão
  ctx.fillStyle="#333";
  ctx.fillRect(-cameraX,330,worldWidth,70);

  // banco
  ctx.fillStyle="blue";
  ctx.fillRect(bank.x-cameraX, bank.y,60,60);

  // polícia
  police.forEach(p=>{
    ctx.fillStyle = p.siren ? "red" : "blue";
    ctx.fillRect(p.x-cameraX,p.y,50,30);
    p.siren = !p.siren;
  });

  // balas
  ctx.fillStyle="white";
  bullets.forEach(b=>{
    ctx.fillRect(b.x-cameraX,b.y,5,5);
  });

  // player
  ctx.fillStyle="lime";
  ctx.fillRect(player.x-cameraX,player.y,30,30);
}

// UPDATE
function update(){

  if(player.life <= 0){
    document.getElementById("gameOver").style.display="block";
    return;
  }

  player.vy += gravity;
  player.y += player.vy;

  if(player.y > 300){
    player.y = 300;
    player.vy = 0;
  }

  // polícia persegue
  if(wanted > 0){
    police.forEach(p=>{
      if(p.x > player.x) p.x -= 2;
      else p.x += 2;

      // dano
      if(Math.abs(p.x-player.x)<30){
        player.life -= 0.2;
      }
    });
  }

  // balas
  bullets.forEach(b=>b.x += 6);

  draw();
  updateUI();
  requestAnimationFrame(update);
}

// CONTROLES
function moveLeft(){ player.x -= 10; }
function moveRight(){ player.x += 10; }

function jump(){
  if(player.y >= 300){
    player.vy = -10;
  }
}

function shoot(){
  bullets.push({x:player.x+30,y:player.y+10});
  wanted++;
  playBeep(600);
}

function steal(){
  if(Math.abs(player.x-bank.x)<60){
    money += 200;
    wanted += 2;
    playBeep(200);
  }
}

// UI
function updateUI(){
  document.getElementById("life").innerText = Math.floor(player.life);
  document.getElementById("money").innerText = money;
  document.getElementById("wanted").innerText = wanted;
}

// teclado
document.addEventListener("keydown",(e)=>{
  if(e.key==="a") moveLeft();
  if(e.key==="d") moveRight();
  if(e.key==="w") jump();
  if(e.key==="f") shoot();
});

update();
</script>

</body>
</html>

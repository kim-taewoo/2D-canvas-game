// DOM 에서 get 해오는 element 는 canvas 타입일거라는 확신이 없어서인지 아래처럼 JSDoc 형태로 따로 타입을 주입해주지 않으면 자동완성이 동작하지 않는다.
// DOM 에서 가져오지 않고 createElement 로 canvas 를 만들면 타입 주입 없이도 잘 된다.
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("canvas");
const scoreEl = document.querySelector("#scoreEl");
const restartModalEl = document.querySelector("#restartModalEl");
const restartModalScoreEl = document.querySelector("#restartModalScoreEl");
const startModalEl = document.querySelector("#startModalEl");
const restartButtonEl = document.querySelector("#restartButtonEl");
const startButtonEl = document.querySelector("#startButtonEl");
const volumeUpEl = document.querySelector("#volumeUpEl");
const volumeOffEl = document.querySelector("#volumeOffEl");

const c = canvas.getContext("2d");

// const options = {
//   zone: document.getElementById("zone_joystick"),
// };
// const manager = nipplejs.create();
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const isMobile = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent);

const friction = 0.98;
let animationId;
let intervalId;
let timeoutId;
let score = 0;
let projectiles = [];
let enemies = [];
let particlesa = [];
let frames = 0;
let player;
let items = [];
let backgroundParticles = [];
let game = {
  active: false,
};
let audioInitialized = false;

function init() {
  score = 0;
  scoreEl.innerHTML = 0;
  animationId = undefined;
  intervalId = undefined;
  projectiles = [];
  enemies = [];
  particles = [];
  items = [];
  const canvasMiddleX = canvas.width / 2;
  const canvasMiddleY = canvas.height / 2;
  backgroundParticles = [];
  player = new Player({
    x: canvasMiddleX,
    y: canvasMiddleY,
    radius: 10,
    color: "white",
  });
  game = {
    active: true,
  };

  const spacing = 30;
  for (let x = 0; x < canvas.width + spacing; x += spacing) {
    for (let y = 0; y < canvas.height + spacing; y += spacing) {
      backgroundParticles.push(
        new BackgroundParticle({
          position: {
            x,
            y,
          },
          radius: 3,
        })
      );
    }
  }

  // 객체들의 자취 제거 (fillRect 에 투명도 있는 색으로 게임중에 덧칠하기 때문에 흔적이 남음)
  c.fillStyle = "black";
  c.fillRect(0, 0, canvas.width, canvas.height);
}

function spawnEnemies() {
  intervalId = setInterval(() => {
    // 원하는 Minimum value 를 빼고 곱한 뒤 더해준다.
    const radius = Math.random() * (30 - 4) + 4;

    let x;
    let y;

    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
      y = Math.random() * canvas.height;
    } else {
      x = Math.random() * canvas.width;
      y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
    }

    const color = `hsl(${Math.random() * 360}, 50%, 50%)`;

    // Always subtract from your destination
    const angle = Math.atan2(player.y - y, player.x - x);

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    enemies.push(new Enemy({ x, y, radius, color, velocity }));
  }, 1000);
}

function spawnItems() {
  spawnItemsId = setInterval(() => {
    items.push(
      new Item({
        position: { x: -30, y: Math.random() * canvas.height },
        velocity: { x: Math.random() + 2, y: 0 },
        image: "./img/lightningBolt.png",
      })
    );
  }, 5000);
}

function createScoreLabel({ position, score }) {
  const scoreLabel = document.createElement("label");
  scoreLabel.innerHTML = score;
  scoreLabel.style.color = "white";
  scoreLabel.style.position = "absolute";
  scoreLabel.style.left = position.x + "px";
  scoreLabel.style.top = position.y + "px";
  scoreLabel.style.userSelect = "none";
  scoreLabel.style.pointerEvents = "none";
  document.body.appendChild(scoreLabel);

  gsap.to(scoreLabel, {
    opacity: 0,
    y: -30,
    duration: 0.75,
    onComplete: () => {
      scoreLabel.parentNode.removeChild(scoreLabel);
    },
  });
}

// **왜 for loop 을 거꾸로 하는가??**
// 그렇게 해야만 array 에서 element 를 제거하는 경우가 있을 때 (splice 같은 걸 통해서) 제거하는 element 의 뒤쪽 index 를 망치지 않을 것을 확신할 수 있다.
// 또한 이미 화면에 그려진 element 가 있는데 그 element 를 지우게 되면 이미 그려졌던 화면이 깜빡이면서 다시 그리게 되는 상황이 발생하게 되는데,
// 이를 막기 위해 setTimeout 같은 걸 이용해서 render 순서를 뒤로 미뤄야 하는 귀찮은 짓을 안 할 수 있다.

function animate() {
  animationId = requestAnimationFrame(animate);
  // 원래는 clearRect 를 해서 완전히 지워지고 새로운 프레임을 그려야 하겠지만
  // opacity 를 넣어줌으로써 빛의 꼬리 효과를 낼 수 있다. (fillRect 로 이전 것을 다 덮어버리긴 하지만 투명도가 있으므로 좀 덜 지워지는 느낌으로 덮임)
  c.fillStyle = "rgba(0,0,0,0.1)";
  c.fillRect(0, 0, canvas.width, canvas.height);
  frames++;
  // c.clearRect(0, 0, canvas.width, canvas.height);
  player.update();
  executeKeyController();

  backgroundParticles.forEach((backgroundParticle) => {
    backgroundParticle.draw();

    const dist = Math.hypot(
      player.x - backgroundParticle.position.x,
      player.y - backgroundParticle.position.y
    );

    if (dist < 100) {
      backgroundParticle.alpha = 0;

      if (dist > 70) {
        backgroundParticle.alpha = 0.5;
      }
    } else if (dist > 100 && backgroundParticle.alpha < 0.1) {
      backgroundParticle.alpha += 0.01;
    } else if (dist > 100 && backgroundParticle.alpha > 0.1) {
      backgroundParticle.alpha -= 0.01;
    }
  });

  for (let itemIndex = items.length - 1; itemIndex >= 0; itemIndex--) {
    const item = items[itemIndex];
    if (item.position.x > canvas.width) {
      items.splice(itemIndex, 1);
    } else item.update();

    const dist = Math.hypot(
      player.x - item.position.x,
      player.y - item.position.y
    );
    if (dist < item.image.height / 2 + player.radius) {
      items.splice(itemIndex, 1);
      player.weapon = "MachineGun";
      player.color = "yellow";
      audio.powerUp.play();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        player.weapon = null;
        player.color = "white";
      }, 5000);
    }
  }

  if (player.weapon === "MachineGun") {
    const angle = Math.atan2(
      mouse.position.y - player.y,
      mouse.position.x - player.x
    );
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5,
    };

    if (frames % 2 === 0) {
      projectiles.push(
        new Projectile({
          x: player.x,
          y: player.y,
          radius: 5,
          color: "yellow",
          velocity,
        })
      );
    }

    if (frames % 5 === 0) {
      audio.shoot.play();
    }
  }

  for (
    let particleIndex = particles.length - 1;
    particleIndex >= 0;
    particleIndex--
  ) {
    const particle = particles[particleIndex];
    if (particle.alpha <= 0) {
      particles.splice(particleIndex, 1);
    } else {
      particle.update();
    }
  }

  for (
    let projectileIndex = projectiles.length - 1;
    projectileIndex >= 0;
    projectileIndex--
  ) {
    const projectile = projectiles[projectileIndex];
    projectile.update();
    if (
      projectile.x + projectile.radius < 0 ||
      projectile.x - projectile.radius > canvas.width ||
      projectile.y + projectile.radius < 0 ||
      projectile.y - projectile.radius > canvas.height
    ) {
      projectiles.splice(projectileIndex, 1);
    }
  }

  for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
    const enemy = enemies[enemyIndex];
    enemy.update();

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist - enemy.radius - player.radius < 0.5) {
      console.log("GAME OVER");
      cancelAnimationFrame(animationId);
      clearInterval(intervalId);
      clearInterval(spawnItemsId);
      audio.death.play();
      game.active = false;

      restartModalEl.style.display = "block";
      restartModalScoreEl.innerHTML = score;

      // fromTo 는 2번째 객체가 변경 전(default) 상태일 때, 3번째가 변경 후 원하는 값
      gsap.fromTo(
        "#restartModalEl",
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: "expo",
        }
      );
    }

    for (
      let projectileIndex = projectiles.length - 1;
      projectileIndex >= 0;
      projectileIndex--
    ) {
      const projectile = projectiles[projectileIndex];
      const dist = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

      // When the projectile hits an enemy
      if (dist - enemy.radius - projectile.radius < 0.5) {
        // create explosion effect
        for (let i = 0; i < enemy.radius * 2; i++) {
          particles.push(
            new Particle({
              x: projectile.x,
              y: projectile.y,
              radius: Math.random() * 2,
              color: enemy.color,
              velocity: {
                x: (Math.random() - 0.5) * (Math.random() * 6),
                y: (Math.random() - 0.5) * (Math.random() * 6),
              },
            })
          );
        }
        // 맞아서 줄어든 뒤에도 맞추기 쉬울 정도의 크기는 되어야 한다.
        if (enemy.radius - 10 > 7) {
          // gsap 을 이용해서 enemy 의 radius shrink 값 변경을 보간해준다.
          audio.damageTaken.play();
          score += 100;
          scoreEl.innerHTML = score;
          gsap.to(enemy, {
            radius: enemy.radius - 10,
          });
          createScoreLabel({
            position: {
              x: projectile.x,
              y: projectile.y,
            },
            score: 100,
          });
          projectiles.splice(projectileIndex, 1);
        } else {
          audio.explode.play();
          score += 150;
          scoreEl.innerHTML = score;

          createScoreLabel({
            position: {
              x: projectile.x,
              y: projectile.y,
            },
            score: 150,
          });

          // change background particle colors
          backgroundParticles.forEach((backgroundParticle) => {
            gsap.set(backgroundParticle, {
              color: "white",
              alpha: 1,
            });
            gsap.to(backgroundParticle, {
              color: enemy.color,
              alpha: 0.1,
            });
            // backgroundParticle.color = enemy.color
          });

          // TODO: gsap 으로 값을 보간하려고 해도 바로 아래서 splice 로 제거해버리므로 줄어드는 게 보이기 전에 없어져 버린다.
          // 줄어드는 게 보이도록 수정 필요 (제거해버리는 걸 다음 루프로 넘기면 되지 않을까 싶기도 한데.. 애매)
          // gsap.to(enemy, {
          //   radius: 0,
          // });
          enemies.splice(enemyIndex, 1);
          projectiles.splice(projectileIndex, 1);
        }
      }
    }
  }
}

function shoot({ x, y }) {
  if (!game.active) return;
  // atan 은 x, y 에 따른 각도를 반환해준다. y 를 첫번째 인자로 받음에 주의
  // 0 to 360 degrees 는 0 to 6.28 radians 와 같다(2PI)
  // HTML canvas API 에선 오른쪽(Positive X) 축을 0 으로 잡고 시작하는 경우가 많은듯
  const angle = Math.atan2(y - player.y, x - player.x);
  // cos is for X and sin for Y
  const velocity = {
    x: Math.cos(angle) * 5,
    y: Math.sin(angle) * 5,
  };
  const projectile = new Projectile({
    x: player.x,
    y: player.y,
    radius: 5,
    color: "white",
    velocity,
  });
  projectiles.push(projectile);
  audio.shoot.play();
}

window.addEventListener("pointerdown", (e) => {
  if (!audio.background.playing() && !audioInitialized) {
    audio.background.play();
    audioInitialized = true;
  }
});

window.addEventListener("pointerdown", (event) => {
  // const x = event.touches[0].clientX;
  // const y = event.touches[0].clientY;
  const x = event.clientX;
  const y = event.clientY;

  mouse.position.x = x;
  mouse.position.y = y;

  shoot({ x, y });
});

addEventListener("touchmove", (event) => {
  mouse.position.x = event.touches[0].clientX;
  mouse.position.y = event.touches[0].clientY;
});

const mouse = {
  position: {
    x: 0,
    y: 0,
  },
};

function onMouseMove(e) {
  mouse.position.x = e.clientX;
  mouse.position.y = e.clientY;
}

window.addEventListener("mousemove", onMouseMove);

// 브라우저에 따라 화면의 크기는 렌더링 과정에서 달라질 수 있다. 따라서 canvas 너비, 높이를 초기 한 번의 값으로 세팅하기 보다
// resize 이벤트에 따라 풀 사이즈를 세팅해주는 것이 좋다.(근데 분명히 사이즈가 변했는데 resize 핸들러의 콘솔을 안 찍힘.. 숨기는 건가?)
window.addEventListener("resize", () => {
  console.log("window resized");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init();
});

// restart game
restartButtonEl.addEventListener("click", () => {
  audio.select.play();
  init();
  animate();
  spawnEnemies();
  spawnItems();
  // restartModalEl.style.display = "none";
  gsap.to("#restartModalEl", {
    opacity: 0,
    scale: 0.8,
    duration: 0.2,
    ease: "expo.in",
    onComplete: () => {
      restartModalEl.style.display = "none";
    },
  });
});

// start game
startButtonEl.addEventListener("click", () => {
  audio.select.play();
  init();
  animate();
  spawnEnemies();
  spawnItems();
  // startModalEl.style.display = 'none'
  gsap.to("#startModalEl", {
    opacity: 0,
    scale: 0.8,
    duration: 0.2,
    ease: "expo.in",
    onComplete: () => {
      startModalEl.style.display = "none";
    },
  });
});

// mute everything
volumeUpEl.addEventListener("click", () => {
  audio.background.pause();
  volumeOffEl.style.display = "block";
  volumeUpEl.style.display = "none";

  for (let key in audio) {
    audio[key].mute(true);
  }
});

// unmute everything
volumeOffEl.addEventListener("click", () => {
  if (audioInitialized) audio.background.play();
  volumeOffEl.style.display = "none";
  volumeUpEl.style.display = "block";
  for (let key in audio) {
    audio[key].mute(false);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // inactive
    // clearIntervals
    clearInterval(intervalId);
    clearInterval(spawnPowerUpsId);
  } else {
    // spawnEnemies spawnPowerUps
    spawnEnemies();
    spawnPowerUps();
  }
});

const keyPressedController = {
  d: { pressed: false, func: () => (player.velocity.x += 0.1) },
  w: { pressed: false, func: () => (player.velocity.y -= 0.1) },
  a: { pressed: false, func: () => (player.velocity.x -= 0.1) },
  s: { pressed: false, func: () => (player.velocity.y += 0.1) },
};

window.addEventListener("keydown", (event) => {
  const pressedKey = event.key;
  if (keyPressedController[pressedKey]) {
    keyPressedController[pressedKey].pressed = true;
  }
});

window.addEventListener("keyup", (event) => {
  const pressedKey = event.key;
  if (keyPressedController[pressedKey]) {
    keyPressedController[pressedKey].pressed = false;
  }
});

function executeKeyController() {
  Object.keys(keyPressedController).forEach((key) => {
    keyPressedController[key].pressed && keyPressedController[key].func();
  });
}

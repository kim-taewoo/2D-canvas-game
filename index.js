// DOM 에서 get 해오는 element 는 canvas 타입일거라는 확신이 없어서인지 아래처럼 JSDoc 형태로 따로 타입을 주입해주지 않으면 자동완성이 동작하지 않는다.
// DOM 에서 가져오지 않고 createElement 로 canvas 를 만들면 타입 주입 없이도 잘 된다.
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("canvas");
const scoreEl = document.querySelector("#score");
const c = canvas.getContext("2d");

canvas.width =
  // document.documentElement.clientWidth ||
  // document.clientWidth ||
  window.innerWidth;
canvas.height =
  // document.documentElement.clientHeight ||
  // document.clientHeight ||
  window.innerHeight;
const canvasMiddleX = canvas.width / 2;
const canvasMiddleY = canvas.height / 2;

const friction = 0.98;

let score = 0;
const projectiles = [];
const enemies = [];
const particles = [];

class Player {
  constructor({ x, y, radius, color }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
  }

  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.fillStyle = this.color;
    c.fill();
  }

  update() {
    this.draw();
  }
}

class Projectile {
  constructor({ x, y, radius, color, velocity }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.velocity = velocity;
  }

  draw() {
    c.beginPath();
    c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    c.fillStyle = this.color;
    c.fill();
  }

  // combine draw to update
  update() {
    this.draw();
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
  }
}

class Enemy extends Projectile {
  constructor({ x, y, radius, color, velocity }) {
    super({ x, y, radius, color, velocity });
  }
}

class Particle extends Projectile {
  constructor(args) {
    super({ ...args });
    this.alpha = 1;
  }

  draw() {
    // c.save(), c.restore() 를 통해서 canvas global method 를 호출하면서도
    // 그 영향력을 이 사이 부분에만 제한시킬 수 있다.
    c.save();
    c.globalAlpha = this.alpha;
    super.draw();
    c.restore();
  }

  update() {
    this.draw();
    this.velocity.x *= friction;
    this.velocity.y *= friction;
    this.x = this.x + this.velocity.x;
    this.y = this.y + this.velocity.y;
    this.alpha -= 0.01;
  }
}

const player = new Player({
  x: canvasMiddleX,
  y: canvasMiddleY,
  radius: 10,
  color: "white",
});

(function spawnEnemies() {
  setInterval(() => {
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
})();

// **왜 for loop 을 거꾸로 하는가??**
// 그렇게 해야만 array 에서 element 를 제거하는 경우가 있을 때 (splice 같은 걸 통해서) 제거하는 element 의 뒤쪽 index 를 망치지 않을 것을 확신할 수 있다.
// 또한 이미 화면에 그려진 element 가 있는데 그 element 를 지우게 되면 이미 그려졌던 화면이 깜빡이면서 다시 그리게 되는 상황이 발생하게 되는데,
// 이를 막기 위해 setTimeout 같은 걸 이용해서 render 순서를 뒤로 미뤄야 하는 귀찮은 짓을 안 할 수 있다.

let animationId;
(function animate() {
  animationId = requestAnimationFrame(animate);
  // 원래는 clearRect 를 해서 완전히 지워지고 새로운 프레임을 그려야 하겠지만
  // opacity 를 넣어줌으로써 빛의 꼬리 효과를 낼 수 있다. (fillRect 로 이전 것을 다 덮어버리긴 하지만 투명도가 있으므로 좀 덜 지워지는 느낌으로 덮임)
  c.fillStyle = "rgba(0,0,0,0.1)";
  c.fillRect(0, 0, canvas.width, canvas.height);
  // c.clearRect(0, 0, canvas.width, canvas.height);
  player.update();

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
          score += 100;
          scoreEl.innerHTML = score;
          gsap.to(enemy, {
            radius: enemy.radius - 10,
          });
          projectiles.splice(projectileIndex, 1);
        } else {
          score += 150;
          scoreEl.innerHTML = score;

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
})();

window.addEventListener("click", (e) => {
  // atan 은 x, y 에 따른 각도를 반환해준다. y 를 첫번째 인자로 받음에 주의
  // 0 to 360 degrees 는 0 to 6.28 radians 와 같다(2PI)
  // HTML canvas API 에선 오른쪽(Positive X) 축을 0 으로 잡고 시작하는 경우가 많은듯
  const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
  // cos is for X and sin for Y
  const velocity = {
    x: Math.cos(angle) * 5,
    y: Math.sin(angle) * 5,
  };
  const projectile = new Projectile({
    x: canvasMiddleX,
    y: canvasMiddleY,
    radius: 5,
    color: "white",
    velocity,
  });
  projectiles.push(projectile);
});

// 브라우저에 따라 화면의 크기는 렌더링 과정에서 달라질 수 있다. 따라서 canvas 너비, 높이를 초기 한 번의 값으로 세팅하기 보다
// resize 이벤트에 따라 풀 사이즈를 세팅해주는 것이 좋다.(근데 분명히 사이즈가 변했는데 resize 핸들러의 콘솔을 안 찍힘.. 숨기는 건가?)
window.addEventListener("resize", () => {
  console.log("resized");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

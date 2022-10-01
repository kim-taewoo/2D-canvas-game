// DOM 에서 get 해오는 element 는 canvas 타입일거라는 확신이 없어서인지 아래처럼 JSDoc 형태로 따로 타입을 주입해주지 않으면 자동완성이 동작하지 않는다.
// DOM 에서 가져오지 않고 createElement 로 canvas 를 만들면 타입 주입 없이도 잘 된다.
/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const canvasMiddleX = canvas.width / 2;
const canvasMiddleY = canvas.height / 2;

const projectiles = [];
const enemies = [];

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

const player = new Player({
  x: canvasMiddleX,
  y: canvasMiddleY,
  radius: 40,
  color: "blue",
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

    const color = "green";

    // Always subtract from your destination
    const angle = Math.atan2(player.y - y, player.x - x);

    const velocity = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    enemies.push(new Enemy({ x, y, radius, color, velocity }));
  }, 1000);
})();

(function animate() {
  requestAnimationFrame(animate);
  c.clearRect(0, 0, canvas.width, canvas.height);
  player.update();
  projectiles.forEach((projectile) => {
    projectile.update();
  });
  enemies.forEach((enemy) => {
    enemy.update();

    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist - enemy.radius - player.radius < 1) {
      console.log("GAME OVER");
    }

    // projectiles.forEach((projectile) => {
    //   const dist = Math.hypot(projectile.x - enemy.x, projectile.y, -enemy.y);
    //   if (dist - enemy.radius - projectile.radius < 1) {
    //     alert("hit!");
    //   }
    // });
  });
})();

window.addEventListener("click", (e) => {
  // atan 은 x, y 에 따른 각도를 반환해준다. y 를 첫번째 인자로 받음에 주의
  // 0 to 360 degrees 는 0 to 6.28 radians 와 같다(2PI)
  // HTML canvas API 에선 오른쪽(Positive X) 축을 0 으로 잡고 시작하는 경우가 많은듯
  const angle = Math.atan2(e.clientY - player.y, e.clientX - player.x);
  // cos is for X and sin for Y
  const velocity = {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
  const projectile = new Projectile({
    x: canvasMiddleX,
    y: canvasMiddleY,
    radius: 5,
    color: "red",
    velocity,
  });
  projectiles.push(projectile);
});

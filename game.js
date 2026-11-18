(() => {
  "use strict";
  const stages = window.INGREDIENT_STAGES;
  const ingredients = window.INGREDIENTS;
  const nutrition = window.NUTRITION;
  const $ = (id) => document.getElementById(id);
  const canvas = $("pokeCanvas"),
    ctx = canvas.getContext("2d");
  const imageSize = 900;
  const bowl = { x: 0.5, y: 0.5, r: 0.443 };
  const images = new Map();
  const failed = new Set();
  let step = 0,
    placed = [],
    drag = null,
    nextZ = 0,
    bowlReady = false;

  function loadImage(url) {
    if (images.has(url)) return Promise.resolve(images.get(url));
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images.set(url, img);
        resolve(img);
        draw();
      };
      img.onerror = () => {
        failed.add(url);
        resolve(null);
      };
      img.src = url;
    });
  }
  function point(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width,
      y: (ev.clientY - r.top) / r.height,
    };
  }
  function inside(p) {
    return Math.hypot(p.x - bowl.x, p.y - bowl.y) <= bowl.r;
  }

function draw() {
  if (!bowlReady) return;

  ctx.clearRect(0, 0, imageSize, imageSize);

  ctx.drawImage(
    images.get("images/bowl.png"),
    0, 0,
    imageSize, imageSize
  );

  for (const p of placed) {
    const item = ingredients[p.id];
    const img = images.get(item.food);

    if (!img) continue;

    const size = item.size * imageSize * 1.5;

    // 원본 이미지 비율 계산
    const ratio = img.naturalWidth / img.naturalHeight;

    let width, height;

    if (ratio >= 1) {
      // 가로가 긴 이미지
      width = size;
      height = size / ratio;
    } else {
      // 세로가 긴 이미지
      width = size * ratio;
      height = size;
    }

    // 이미지 중심 기준 배치
    ctx.drawImage(
      img,
      p.x * imageSize - width / 2,
      p.y * imageSize - height / 2,
      width,
      height
    );
  }
}

  function stopDrag(cancel, ev) {
    if (!drag || (ev && ev.pointerId !== drag.pointerId)) return;
    const d = drag;
    drag = null;
    if (d.ghost) d.ghost.remove();
    if (d.kind === "new") {
      if (!cancel && ev) {
        const p = point(ev);
        if (inside(p) && placed.length < 20) placed.push({ id: d.id, x: p.x, y: p.y, z: ++nextZ });
      }
    } else {
      const p = ev ? point(ev) : d.original;
      if (cancel || !inside(p)) {
        d.item.x = d.original.x;
        d.item.y = d.original.y;
      } else {
        d.item.x = p.x;
        d.item.y = p.y;
      }
    }
    draw();
    renderReceipt();
  }
  function moveDrag(ev) {
    if (!drag || drag.pointerId !== ev.pointerId) return;
    if (drag.kind === "new") {
      drag.ghost.style.left = ev.clientX + "px";
      drag.ghost.style.top = ev.clientY + "px";
    } else {
      const p = point(ev);
      drag.item.x = p.x;
      drag.item.y = p.y;
      draw();
    }
  }
  window.addEventListener("pointermove", moveDrag, { passive: true });
  window.addEventListener("pointerup", (ev) => stopDrag(false, ev));
  window.addEventListener("pointercancel", (ev) => stopDrag(true, ev));
  window.addEventListener("blur", () => stopDrag(true));

  function startNew(ev, id) {
    if (!bowlReady || drag || ev.button !== 0) return;
    if (placed.length >= 20) { $("help").textContent = "재료는 최대 20개까지 선택할 수 있어요."; return; }
    ev.preventDefault();
    const item = ingredients[id];
    const ghost = document.createElement("img");
    ghost.className = "drag-ghost";
    ghost.src = item.food;
    const width = canvas.getBoundingClientRect().width * item.size;
    ghost.style.width = width + "px";
    ghost.style.height = width + "px";
    ghost.style.left = ev.clientX + "px";
    ghost.style.top = ev.clientY + "px";
    document.body.appendChild(ghost);
    drag = { kind: "new", id, pointerId: ev.pointerId, ghost };
  }
  function hit(p) {
    for (let i = placed.length - 1; i >= 0; i--) {
      const obj = placed[i];
      const half = ingredients[obj.id].size * 0.4;
      if (Math.abs(p.x - obj.x) < half && Math.abs(p.y - obj.y) < half)
        return { obj, i };
    }
    return null;
  }
  canvas.addEventListener("pointerdown", (ev) => {
    if (drag || ev.button !== 0) return;
    const found = hit(point(ev));
    if (!found) return;
    ev.preventDefault();
    const obj = found.obj;
    placed.splice(found.i, 1);
    placed.push(obj);
    obj.z = ++nextZ;
    drag = {
      kind: "existing",
      item: obj,
      pointerId: ev.pointerId,
      original: { x: obj.x, y: obj.y },
    };
    draw();
  });

  function renderStep() {
    $("steps").replaceChildren();
    stages.forEach((stage, i) => {
      const d = document.createElement("div");
      d.className = "step" + (i === step ? " active" : "");
      d.textContent = i + 1 + ". " + stage.name;
      $("steps").appendChild(d);
    });
    const stage = stages[step],
      grid = $("trayGrid");
    $("stepTitle").textContent = stage.name + "을(를) 골라주세요!";
    $("stepCounter").textContent = `STEP ${step + 1} / ${stages.length}`;
    grid.replaceChildren();
    grid.style.gridTemplateColumns = "repeat(2, minmax(0,1fr))";
    for (const id of stage.items) {
      const item = ingredients[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tray-item";
      btn.setAttribute("aria-label", item.name + " 그릇으로 드래그");
      const img = document.createElement("img");
      img.alt = "";
      img.src = item.tray;
      img.onerror = () => {
        btn.classList.add("missing");
        img.alt = "이미지 없음";
      };
      const label = document.createElement("span");
      label.textContent = item.name;
      btn.append(img, label);
      btn.addEventListener("pointerdown", (ev) => startNew(ev, id));
      grid.appendChild(btn);
      loadImage(item.food);
    }
    $("prevBtn").disabled = step === 0;
    $("nextBtn").disabled = step === stages.length - 1;
    // $("help").textContent =
    //   "재료를 누른 채 그릇으로 끌어놓으세요. 놓은 재료도 다시 움직일 수 있어요.";
  }
  function renderReceipt() {
    const counts = new Map();
    for (const p of placed) counts.set(p.id, (counts.get(p.id) || 0) + 1);
    const list = $("receiptItems");
    list.replaceChildren();
    if (!counts.size) { const empty = document.createElement("p"); empty.className="receipt-empty"; empty.textContent="재료를 그릇에 담아주세요"; list.appendChild(empty); }
    for (const [id, qty] of counts) {
      const row = document.createElement("div"); row.className="receipt-row";
      const name = document.createElement("span"); name.textContent=ingredients[id].name;
      const count = document.createElement("span"); count.textContent=String(qty);
      row.append(name,count); list.appendChild(row);
    }
    $("receiptCount").textContent = `${placed.length} / 20`;
  }
  function totals() {
    const keys = [
      "calories",
      "carbohydrate",
      "protein",
      "fat",
      "sugar",
      "sodium",
    ];
    const result = Object.fromEntries(keys.map((k) => [k, 0]));
    for (const p of placed) {
      const data = nutrition[p.id];
      if (!data) continue;
      for (const key of keys) result[key] += Number(data[key]) || 0;
    }
    return result;
  }
  const format = (n) => Number(n.toFixed(1)).toLocaleString("ko-KR");
  function drawResult() {
    draw();
    const c = $("resultCanvas"),
      g = c.getContext("2d");
    c.width = 1000;
    c.height = 1220;
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#1e5426";
    g.textAlign = "center";
    g.font = "bold 64px Paperlogy";
    g.fillText("나만의 포케 완성!🥬", 500, 98);
    g.font = "32px Paperlogy";
    g.font = "semibold 26px Paperlogy";
    g.fillText("완성된 포케 이미지를 저장하여 하단 링크에 올려주세요!", 500, 151);
    g.font = "semibold 26px Paperlogy";
    g.fillText("추첨을 통해 영칼로리포케 식사권을 드립니다!", 500, 197); 
    g.drawImage(canvas, 80, 220, 840, 840);
    const t = totals();
    g.fillStyle = "#173d1c";
    g.font = "700 34px Paperlogy";
    g.fillText(
      `${format(t.calories)} kcal  |  탄수화물 ${format(t.carbohydrate)}g  |  단백질 ${format(t.protein)}g`,
      500,
      1100
    );

    g.font = "500 28px Paperlogy";
    g.fillText(
      `지방 ${format(t.fat)}g  |  당류 ${format(t.sugar)}g  |  나트륨 ${format(t.sodium)}mg`,
      500,
      1150
    );
        g.font = "22px Paperlogy";
        g.fillStyle = "#756e61";
        // g.fillText("개발용 임시 영양 수치 · 기본 야채 제외", 500, 1170);
      }
  function showResult() {
    drawResult();
    const t = totals();
    const fields = [
      // ["열량", t.calories, "kcal"],
      // ["탄수화물", t.carbohydrate, "g"],
      // ["단백질", t.protein, "g"],
      // ["지방", t.fat, "g"],
      // ["당류", t.sugar, "g"],
      // ["나트륨", t.sodium, "mg"],
    ];
    $("nutritionInfo").replaceChildren();
    fields.forEach(([name, value, unit]) => {
      const el = document.createElement("div");
      el.textContent = `${name} · ${format(value)} ${unit}`;
      $("nutritionInfo").appendChild(el);
    });
    $("app").classList.add("result-mode");
    $("result").classList.remove("hidden");
    window.scrollTo(0, 0);
  }
  $("prevBtn").onclick = () => {
    if (step > 0) {
      step--;
      renderStep();
    }
  };
  $("nextBtn").onclick = () => {
    if (step < stages.length - 1) {
      step++;
      renderStep();
    }
  };
  $("completeBtn").onclick = showResult;
  $("resetBtn").onclick = () => $("confirmDialog").classList.remove("hidden");
  $("cancelReset").onclick = () => $("confirmDialog").classList.add("hidden");
  $("confirmReset").onclick = () => {
    placed = [];
    nextZ = 0;
    draw();
    renderReceipt();
    $("confirmDialog").classList.add("hidden");
  };
  $("restartBtn").onclick = () => {
    placed = [];
    nextZ = 0;
    step = 0;
    draw();
    renderStep();
    renderReceipt();
    $("result").classList.add("hidden");
    $("app").classList.remove("result-mode");
  };
  $("saveBtn").onclick = () => {
    drawResult();
    const a = document.createElement("a");
    a.download = "나만의-포케.png";
    a.href = $("resultCanvas").toDataURL("image/png");
    a.click();
  };
  canvas.width = imageSize;
  canvas.height = imageSize;
  loadImage("images/bowl.png").then((img) => {
    if (!img) {
      $("help").textContent = "images/bowl.png 파일을 넣어주세요.";
      return;
    }
    bowlReady = true;
    draw();
  });
  renderStep();
  renderReceipt();
})();

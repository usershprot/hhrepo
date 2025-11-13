async function initFileList() {
  const listEl = document.getElementById("list");

  function showConfirm(text) {
    const el = document.createElement("div");
    el.className = "copy-confirm";
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }

  try {
    const res = await fetch("/fl/");
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.querySelectorAll("a"))
      .map((a) => a.getAttribute("href"))
      .filter(
        (h) =>
          h &&
          !h.endsWith("/") &&
          !h.startsWith("?") &&
          !h.startsWith("/") &&
          !h.includes("..")
      );

    if (!links.length) {
      listEl.innerHTML = '<li style="cursor:default">Папка пуста</li>';
      return;
    }

    listEl.innerHTML = "";
    links.forEach((name) => {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.className = "name";
      span.textContent = name;

      const fileUrl = location.origin + "/fl/" + encodeURIComponent(name);

      // Основное действие — скачать
      li.onclick = () => window.open(fileUrl, "_blank");

      // ПКМ — копировать ссылку
      li.oncontextmenu = (e) => {
        e.preventDefault();
        navigator.clipboard.writeText(fileUrl).then(() => {
          showConfirm("Ссылка скопирована");
        });
      };

      // Долгое нажатие — копировать ссылку
      let timer = null;
      li.addEventListener("touchstart", () => {
        timer = setTimeout(() => {
          navigator.clipboard.writeText(fileUrl).then(() => {
            showConfirm("Ссылка скопирована");
          });
        }, 600);
      });
      li.addEventListener("touchend", () => clearTimeout(timer));

      li.appendChild(span);
      listEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    listEl.innerHTML = "<li style='cursor:default'>Ошибка загрузки</li>";
  }
}

document.addEventListener("DOMContentLoaded", initFileList);
// ====== 1. データ本体 ======
// このアプリの「本当の中身」。画面はすべてこのデータから作られる。
// 各列(list)は id / title / cards(カードの配列) を持つ。
// 各カード(card)は id / text / description（説明文） / priority（優先度） / dueDate（期限）を持つ。

// 優先度は "high"（高） / "mid"（中） / "low"（低）の3段階。
// ソートのときに使う「優先度の強さ」の数値表現。大きいほど優先度が高い。
const PRIORITY_ORDER = { high: 3, mid: 2, low: 1 };
const PRIORITY_LABEL = { high: "高", mid: "中", low: "低" };

// localStorageに保存するときのキー名（好きな文字列でよい）
const STORAGE_KEY = "trello-board";

// もし保存データが無かった場合に使う、最初の決め打ちデータ
const defaultBoard = [
  {
    id: "todo",
    title: "未着手",
    cards: [
      { id: "c1", text: "牛乳を買う", description: "", priority: "mid", dueDate: "" },
      { id: "c2", text: "宿題をやる", description: "", priority: "high", dueDate: "" },
    ],
  },
  {
    id: "doing",
    title: "作業中",
    cards: [{ id: "c3", text: "課題アプリを作る", description: "", priority: "high", dueDate: "" }],
  },
  {
    id: "done",
    title: "完了",
    cards: [],
  },
];

// localStorageから読み込む。保存データが無ければdefaultBoardを使う
function loadBoard() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const loadedBoard = saved === null ? defaultBoard : JSON.parse(saved); // 文字列→配列/オブジェクトに戻す

  // 優先度・期限を追加する前に保存されたカードにも、デフォルト値を補っておく
  loadedBoard.forEach((list) => {
    list.cards.forEach((card) => {
      if (card.description === undefined) card.description = "";
      if (card.priority === undefined) card.priority = "mid";
      if (card.dueDate === undefined) card.dueDate = "";

      // 一時期の入力欄（テキスト手入力）で保存された「2026/03/05」のような
      // スラッシュ区切りのデータを、type="date"用のハイフン区切りに戻す
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(card.dueDate)) {
        card.dueDate = card.dueDate.replace(/\//g, "-");
      }
    });
  });

  return loadedBoard;
}

// 現在のboardをlocalStorageに保存する
function saveBoard() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(board)); // 配列→文字列に変換
}

let board = loadBoard();

// カードごとに一意なIDを作るための連番カウンター。
// 保存データに含まれる最大のカード番号より1大きい値から始める。
let nextCardId = 1;
board.forEach((list) => {
  list.cards.forEach((card) => {
    const num = parseInt(card.id.replace("c", ""), 10);
    if (num >= nextCardId) {
      nextCardId = num + 1;
    }
  });
});

// ====== 2. 描画関数 ======
// board配列の中身をもとに、画面のHTMLを作り直す関数。
// 「データが変わったら必ずこの関数を呼ぶ」というルールにする。
function render() {
  // board配列の1列ずつ処理する
  board.forEach((list) => {
    // data-list-id="todo" のような、対応する列の<div class="list">を探す
    const listEl = document.querySelector(`.list[data-list-id="${list.id}"]`);
    // その中の、カードを並べる場所(.card-list)を探す
    const cardListEl = listEl.querySelector(".card-list");

    // 一旦中身を空にする（毎回作り直すため）
    cardListEl.innerHTML = "";

    // この列に入っているカードを1枚ずつHTMLにして追加する
    list.cards.forEach((card) => {
      const cardEl = document.createElement("div");
      cardEl.className = "card";
      // どのカードか後でわかるように、id情報をHTML要素に持たせておく
      cardEl.dataset.cardId = card.id;

      // ドラッグできるようにする
      cardEl.draggable = true;

      // 掴んだ瞬間：どのカードを掴んだかをdataTransferに記録する
      cardEl.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", card.id);
        cardEl.classList.add("dragging"); // 掴んでいる間、見た目を薄くする
      });

      // 離した瞬間：見た目を元に戻す
      cardEl.addEventListener("dragend", () => {
        cardEl.classList.remove("dragging");
        clearDragIndicators(); // 挿入位置の線も消しておく
      });

      // このカードの上を、別のカードがドラッグで通過している間
      cardEl.addEventListener("dragover", (event) => {
        event.preventDefault(); // これを呼ばないとdropイベントが発生しない
        // 「このカードの直前に入りますよ」という線を表示する
        clearDragIndicators();
        cardEl.classList.add("drag-over");
      });

      // ドラッグしたまま、このカードの上から離れた瞬間
      cardEl.addEventListener("dragleave", () => {
        cardEl.classList.remove("drag-over");
      });

      // このカードの上に、別のカードが落とされた瞬間
      // →「このカードの直前」に割り込む形で移動する
      cardEl.addEventListener("drop", (event) => {
        event.stopPropagation(); // 下にある.card-list側のdropが二重に発生しないようにする
        clearDragIndicators();
        const draggedCardId = event.dataTransfer.getData("text/plain");
        moveCard(draggedCardId, list.id, card.id);
      });

      // カードの文字部分
      const textEl = document.createElement("span");
      textEl.className = "card-text";
      textEl.textContent = card.text;

      // テキスト部分をクリックしたら「編集モード」に切り替える
      textEl.addEventListener("click", () => {
        startEditingCard(card, textEl);
      });

      // 説明文の入力欄（常時表示。入力するとすぐに反映される）
      const descEl = document.createElement("textarea");
      descEl.className = "card-desc";
      descEl.rows = 1;
      descEl.placeholder = "説明を追加";
      descEl.value = card.description;
      descEl.addEventListener("change", () => {
        card.description = descEl.value.trim();
        render(); // データが変わったので描き直す
      });

      // 優先度・期限をまとめて表示する行
      const metaEl = document.createElement("div");
      metaEl.className = "card-meta";

      // 優先度セレクト（常時表示で、選ぶとすぐに反映される）
      const prioritySelect = document.createElement("select");
      prioritySelect.className = "card-priority";
      ["high", "mid", "low"].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = PRIORITY_LABEL[value];
        if (card.priority === value) option.selected = true;
        prioritySelect.appendChild(option);
      });
      prioritySelect.addEventListener("change", () => {
        card.priority = prioritySelect.value;
        render(); // データが変わったので描き直す
      });

      // 期限の日付入力（常時表示で、選ぶとすぐに反映される）
      const dueDateInput = document.createElement("input");
      dueDateInput.type = "date";
      dueDateInput.className = "card-due-date";
      dueDateInput.value = card.dueDate;
      dueDateInput.addEventListener("change", () => {
        card.dueDate = dueDateInput.value;
        render(); // データが変わったので描き直す
      });

      metaEl.appendChild(prioritySelect);
      metaEl.appendChild(dueDateInput);

      // 削除用の×ボタン
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-card-btn";
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => {
        // このカードだけを除いた配列を作り、cardsを置き換える
        list.cards = list.cards.filter((c) => c.id !== card.id);
        render(); // データが変わったので描き直す
      });

      // 1段目：テキストと削除ボタンを横並びにする行
      const headerEl = document.createElement("div");
      headerEl.className = "card-header";
      headerEl.appendChild(textEl);
      headerEl.appendChild(deleteBtn);

      cardEl.appendChild(headerEl);
      cardEl.appendChild(descEl);
      cardEl.appendChild(metaEl);
      cardListEl.appendChild(cardEl);
    });
  });

  saveBoard(); // 描画するたびに、最新のboardをlocalStorageへ保存する
  updateSortButtonLabels(); // ソートボタンの矢印（▲/▼）表示も合わせて更新する
}

// ====== 3. 並び替え（ソート）機能 ======
// 各列ごとに「今どの向きでソートしているか」を覚えておく場所。
// 例: { todo: { priority: "asc" }, doing: { dueDate: "desc" } }
const sortState = {};

// 1枚のカードの、比較に使う値を取り出す関数
function getSortValue(card, key) {
  if (key === "priority") {
    return PRIORITY_ORDER[card.priority]; // high=3, mid=2, low=1
  }
  if (key === "dueDate") {
    // 期限が未設定のカードは、常に一番後ろに回す
    return card.dueDate === "" ? Infinity : card.dueDate;
  }
  return 0;
}

// 指定した列(listId)のカードを、指定したキー(priority/dueDate)で並び替える
function sortCards(listId, key) {
  const list = board.find((l) => l.id === listId);

  // この列・このキーについて、今の向きを見て次の向きを決める（asc⇔descを切り替え）
  if (!sortState[listId]) sortState[listId] = {};
  const currentDirection = sortState[listId][key] === "asc" ? "asc" : "desc";
  const nextDirection = currentDirection === "asc" ? "desc" : "asc";
  sortState[listId][key] = nextDirection;

  list.cards.sort((a, b) => {
    const valueA = getSortValue(a, key);
    const valueB = getSortValue(b, key);
    if (valueA < valueB) return nextDirection === "asc" ? -1 : 1;
    if (valueA > valueB) return nextDirection === "asc" ? 1 : -1;
    return 0;
  });

  render(); // データ（並び順）が変わったので描き直す
}

// ソートボタンに、クリックイベントを仕込む（最初に1回だけ呼べばよい）
function setupSortButtons() {
  document.querySelectorAll(".sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const listEl = button.closest(".list");
      const listId = listEl.dataset.listId;
      const key = button.dataset.sortKey;
      sortCards(listId, key);
    });
  });
}

// ソートボタンの文字（▲/▼）を、現在の並び順に合わせて更新する
function updateSortButtonLabels() {
  document.querySelectorAll(".sort-btn").forEach((button) => {
    const listEl = button.closest(".list");
    const listId = listEl.dataset.listId;
    const key = button.dataset.sortKey;
    const direction = sortState[listId] && sortState[listId][key];
    const arrow = direction === "asc" ? "▲" : direction === "desc" ? "▼" : "▲";
    const label = key === "priority" ? "優先度順" : "期限順";
    button.textContent = `${label} ${arrow}`;
  });
}

// ====== 4. ドラッグ&ドロップ本体の処理 ======
// draggedCardId のカードを、targetListId の中の
// beforeCardId の直前に移動する（beforeCardIdがnullなら列の一番後ろに追加）
function moveCard(draggedCardId, targetListId, beforeCardId) {
  // 1. 今どの列にそのカードがあるか探して、配列から取り除く
  let draggedCard = null;
  board.forEach((list) => {
    const index = list.cards.findIndex((c) => c.id === draggedCardId);
    if (index !== -1) {
      draggedCard = list.cards[index];
      list.cards.splice(index, 1); // その位置から1個取り除く
    }
  });

  if (!draggedCard) return; // 見つからなければ何もしない（安全対策）

  // 2. 移動先の列を探す
  const targetList = board.find((l) => l.id === targetListId);

  // 3. 差し込む位置を決めて追加する
  const beforeIndex = targetList.cards.findIndex((c) => c.id === beforeCardId);
  if (beforeIndex === -1) {
    targetList.cards.push(draggedCard); // 目印が無ければ一番後ろに追加
  } else {
    targetList.cards.splice(beforeIndex, 0, draggedCard); // 目印の直前に挿入
  }

  render(); // データが変わったので描き直す
}

// 各列の「カードを並べる場所(.card-list)」自体に対するドラッグ&ドロップ設定。
// カードが1枚も無い場所や、カードの隙間に落としたときに列の最後に追加する。
function setupDropZones() {
  document.querySelectorAll(".card-list").forEach((cardListEl) => {
    cardListEl.addEventListener("dragover", (event) => {
      event.preventDefault(); // ここにも「落としてOK」の許可を出す
      // カードとカードの間（個別カードのdragover）で既に線が出ていなければ、
      // 「この列の一番後ろに入りますよ」という線を列の下に表示する
      if (!event.target.closest(".card")) {
        clearDragIndicators();
        cardListEl.classList.add("drag-over-end");
      }
    });

    cardListEl.addEventListener("dragleave", (event) => {
      if (!event.target.closest(".card")) {
        cardListEl.classList.remove("drag-over-end");
      }
    });

    cardListEl.addEventListener("drop", (event) => {
      clearDragIndicators();
      const listEl = cardListEl.closest(".list");
      const listId = listEl.dataset.listId;
      const draggedCardId = event.dataTransfer.getData("text/plain");
      // beforeCardIdをnullにする＝列の一番後ろに追加、という意味
      moveCard(draggedCardId, listId, null);
    });
  });
}

// 表示中の「挿入位置の線」を全部消す（新しい位置に表示し直す前に、毎回リセットする）
function clearDragIndicators() {
  document.querySelectorAll(".card.drag-over").forEach((el) => {
    el.classList.remove("drag-over");
  });
  document.querySelectorAll(".card-list.drag-over-end").forEach((el) => {
    el.classList.remove("drag-over-end");
  });
}

// ====== 5. カード編集機能 ======
// クリックされたカードのテキスト部分(span)を、入力欄(input)に一時的に差し替える
function startEditingCard(card, textEl) {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-card-input";
  input.value = card.text; // 今の文字を初期値にする

  // spanをinputに置き換える
  textEl.replaceWith(input);
  input.focus();   // 入力欄に自動でカーソルを合わせる
  input.select();  // 中の文字を選択状態にしておく（書き直しやすいように）

  // 編集を確定してデータに保存する処理
  function finishEditing() {
    const newText = input.value.trim();
    // 空文字にはしない。空なら元の文字に戻す
    card.text = newText === "" ? card.text : newText;
    render(); // データが変わったので描き直す
  }

  // Enterキーが押されたら編集を確定する
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      input.blur(); // blurイベントを発生させて下のfinishEditingにつなげる
    }
  });

  // 入力欄からフォーカスが外れたら編集を確定する
  input.addEventListener("blur", finishEditing);
}

// ====== 6. カード追加機能（モーダル） ======
// モーダルの各要素をまとめて取得しておく
const modalOverlay = document.getElementById("modal-overlay");
const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskDescInput = document.getElementById("task-desc");
const taskDueInput = document.getElementById("task-due");
const titleErrorEl = document.getElementById("title-error");

let modalListId = null; // 「＋ タスク追加」をどの列のボタンから開いたかを覚えておく

// モーダルを開く（listIdの列に追加するつもりで開く）
function openModal(listId) {
  modalListId = listId;
  taskForm.reset(); // 前回入力した内容が残らないようにリセットする
  titleErrorEl.hidden = true;
  modalOverlay.hidden = false;
  taskTitleInput.focus();
}

// モーダルを閉じる
function closeModal() {
  modalOverlay.hidden = true;
}

// 「＋ タスク追加」ボタン・モーダルのイベントをまとめて設定する
function setupAddCardButtons() {
  // 各列の「＋ タスク追加」ボタンを押したら、その列を覚えてモーダルを開く
  document.querySelectorAll(".list").forEach((listEl) => {
    listEl.querySelector(".add-card-btn").addEventListener("click", () => {
      openModal(listEl.dataset.listId);
    });
  });

  // フォームの「保存」ボタン（＝submit）が押されたときの処理
  taskForm.addEventListener("submit", (event) => {
    event.preventDefault(); // ページがリロードされるデフォルトの動作を止める

    const title = taskTitleInput.value.trim();
    if (title === "") {
      titleErrorEl.hidden = false; // タイトル未入力ならエラー文を表示して中断
      return;
    }

    // board配列の中から、モーダルを開いたときの列を探す
    const list = board.find((l) => l.id === modalListId);

    // ラジオボタンで選ばれている優先度を取得する（taskForm.priority で name="priority" の値を取れる）
    const priority = taskForm.priority.value;

    list.cards.push({
      id: `c${nextCardId}`,
      text: title,
      description: taskDescInput.value.trim(),
      priority: priority,
      dueDate: taskDueInput.value, // 未入力なら空文字になる
    });
    nextCardId++;

    closeModal();
    render(); // データが変わったので画面を描き直す
  });

  // 「キャンセル」ボタンで閉じる
  document.getElementById("cancel-btn").addEventListener("click", closeModal);

  // 背景（半透明の部分）をクリックしても閉じる
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) closeModal();
  });

  // Escキーでも閉じる
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modalOverlay.hidden) closeModal();
  });
}

// ====== 7. 最初の描画とイベント設定 ======
// ページが読み込まれた時点で、一度だけ描画・イベント設定をしておく
render();
setupAddCardButtons();
setupDropZones();
setupSortButtons();
updateSortButtonLabels();

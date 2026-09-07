// ====== 1. データ本体 ======
// このアプリの「本当の中身」。画面はすべてこのデータから作られる。
// 各列(list)は id / title / cards(カードの配列) を持つ。
// 各カード(card)は id / text を持つ。

// localStorageに保存するときのキー名（好きな文字列でよい）
const STORAGE_KEY = "trello-board";

// もし保存データが無かった場合に使う、最初の決め打ちデータ
const defaultBoard = [
  {
    id: "todo",
    title: "未着手",
    cards: [
      { id: "c1", text: "牛乳を買う" },
      { id: "c2", text: "宿題をやる" },
    ],
  },
  {
    id: "doing",
    title: "作業中",
    cards: [{ id: "c3", text: "課題アプリを作る" }],
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
  if (saved === null) {
    return defaultBoard;
  }
  return JSON.parse(saved); // 文字列→配列/オブジェクトに戻す
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
      });

      // このカードの上を、別のカードがドラッグで通過している間
      cardEl.addEventListener("dragover", (event) => {
        event.preventDefault(); // これを呼ばないとdropイベントが発生しない
      });

      // このカードの上に、別のカードが落とされた瞬間
      // →「このカードの直前」に割り込む形で移動する
      cardEl.addEventListener("drop", (event) => {
        event.stopPropagation(); // 下にある.card-list側のdropが二重に発生しないようにする
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

      // 削除用の×ボタン
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-card-btn";
      deleteBtn.textContent = "×";
      deleteBtn.addEventListener("click", () => {
        // このカードだけを除いた配列を作り、cardsを置き換える
        list.cards = list.cards.filter((c) => c.id !== card.id);
        render(); // データが変わったので描き直す
      });

      cardEl.appendChild(textEl);
      cardEl.appendChild(deleteBtn);
      cardListEl.appendChild(cardEl);
    });
  });

  saveBoard(); // 描画するたびに、最新のboardをlocalStorageへ保存する
}

// ====== 3. ドラッグ&ドロップ本体の処理 ======
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
    });

    cardListEl.addEventListener("drop", (event) => {
      const listEl = cardListEl.closest(".list");
      const listId = listEl.dataset.listId;
      const draggedCardId = event.dataTransfer.getData("text/plain");
      // beforeCardIdをnullにする＝列の一番後ろに追加、という意味
      moveCard(draggedCardId, listId, null);
    });
  });
}

// ====== 4. カード編集機能 ======
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

// ====== 4. カード追加機能 ======
// 「＋ 追加」ボタンがクリックされたときの処理をまとめた関数
function setupAddCardButtons() {
  // ページ上の .list を全部取得して、1つずつイベントを仕込む
  document.querySelectorAll(".list").forEach((listEl) => {
    const listId = listEl.dataset.listId; // "todo" などの列ID
    const input = listEl.querySelector(".new-card-input");
    const button = listEl.querySelector(".add-card-btn");

    button.addEventListener("click", () => {
      const text = input.value.trim(); // 前後の余計な空白を除去

      // 何も入力されていなければ何もしない
      if (text === "") return;

      // board配列の中から、対応する列を探す
      const list = board.find((l) => l.id === listId);

      // 新しいカードを追加する
      list.cards.push({ id: `c${nextCardId}`, text: text });
      nextCardId++;

      input.value = ""; // 入力欄を空にする
      render();          // データが変わったので画面を描き直す
    });
  });
}

// ====== 6. 最初の描画とイベント設定 ======
// ページが読み込まれた時点で、一度だけ描画・イベント設定をしておく
render();
setupAddCardButtons();
setupDropZones();

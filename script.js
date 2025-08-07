// script.js
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("api-key-input");
  const saveApiKeyBtn = document.getElementById("save-api-key-btn");
  const mainContent = document.getElementById("main-content");
  const apiKeySection = document.getElementById("api-key-section");

  const storyForm = document.getElementById("story-form");
  const promptTextarea = document.getElementById("story-prompt");
  const createBtn = document.getElementById("create-btn");
  const btnText = createBtn.querySelector(".btn-text");
  const loader = createBtn.querySelector(".loader");
  const statusText = createBtn.querySelector(".status-text");

  const storyPlayer = document.getElementById("story-player");
  const downloadBtn = document.getElementById("download-btn");
  const playerSection = document.getElementById("story-player-section");

  const historyList = document.getElementById("history-list");
  const exampleBtns = document.querySelectorAll(".example-btn");

  let genAI;

  function initializeApp() {
    const apiKey = localStorage.getItem("googleApiKey");
    if (apiKey) {
      try {
        genAI = new GoogleGenerativeAI(apiKey);
        apiKeySection.style.display = "none";
        mainContent.style.display = "block";
        renderHistory();
      } catch (err) {
        alert("מפתח API שגוי, נסה שוב.");
        localStorage.removeItem("googleApiKey");
      }
    }
  }

  saveApiKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      try {
        new GoogleGenerativeAI(key); // ניסיון התחברות
        localStorage.setItem("googleApiKey", key);
        apiKeyInput.value = "";
        initializeApp();
      } catch {
        alert("נראה שמפתח ה-API שגוי.");
      }
    } else {
      alert("אנא הזן מפתח API.");
    }
  });

  storyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const prompt = promptTextarea.value.trim();
    if (!prompt) {
      alert("אנא הזן נושא לסיפור.");
      return;
    }

    toggleLoading(true, "יוצר תסריט...");

    try {
      const scriptModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });

      const scriptPrompt = `
אתה תסריטאי מומחה לכתיבה בעברית.
בהינתן הנושא: "${prompt}", בצע:
1. הגדר 1–2 דמויות.
2. כתוב תסריט דיאלוג קצר, עד 8 שורות, בפורמט:
"דובר 1: ...", "דוברת 2: ..." וכן הלאה.
3. אל תוסיף טקסט נוסף או הסברים.
`;

      const scriptResult = await scriptModel.generateContent(scriptPrompt);
      const scriptText = (await scriptResult.response.text()).trim();

      toggleLoading(true, "מפיק קובץ שמע...");

      const ttsModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-preview-0514",
        generationConfig: { responseMimeType: "audio/mpeg" }
      });

      const ttsPrompt = `צור קובץ שמע עם קולות שונים לכל דמות מהטקסט הבא:\n${scriptText}`;
      const ttsResult = await ttsModel.generateContent(ttsPrompt);

      const audioBase64 = ttsResult.response.parts[0].inlineData.data;
      const audioBlob = base64ToBlob(audioBase64, "audio/mpeg");
      const audioUrl = URL.createObjectURL(audioBlob);

      displayStory(audioUrl, prompt);
      saveStory(prompt, audioBlob);

    } catch (err) {
      console.error(err);
      alert("שגיאה ביצירת הסיפור: " + err.message);
    } finally {
      toggleLoading(false);
    }
  });

  function toggleLoading(isLoading, msg = "") {
    createBtn.disabled = isLoading;
    btnText.style.display = isLoading ? "none" : "inline";
    loader.style.display = isLoading ? "inline-block" : "none";
    statusText.style.display = isLoading ? "inline" : "none";
    statusText.textContent = msg;
  }

  function base64ToBlob(base64, type = "", sliceSize = 512) {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = [...slice].map(ch => ch.charCodeAt(0));
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type });
  }

  function displayStory(audioUrl, prompt) {
    playerSection.style.display = "block";
    storyPlayer.src = audioUrl;
    storyPlayer.play();
    downloadBtn.href = audioUrl;
    downloadBtn.download = `פשוט_סיפור_${prompt.slice(0, 10).replace(/ /g, "_")}.mp3`;
    playerSection.scrollIntoView({ behavior: "smooth" });
  }

  function saveStory(prompt, blob) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const story = {
        id: Date.now(),
        prompt,
        date: new Date().toLocaleString("he-IL"),
        audioDataUrl: e.target.result
      };
      const history = getHistory();
      history.unshift(story);
      localStorage.setItem("storyHistory", JSON.stringify(history.slice(0, 20)));
      renderHistory();
    };
    reader.readAsDataURL(blob);
  }

  function getHistory() {
    return JSON.parse(localStorage.getItem("storyHistory")) || [];
  }

  function renderHistory() {
    const history = getHistory();
    historyList.innerHTML = "";

    if (history.length === 0) {
      historyList.innerHTML = `<li class="empty-history">אין סיפורים עדיין.</li>`;
      return;
    }

    history.forEach((story) => {
      const li = document.createElement("li");
      li.dataset.id = story.id;
      li.innerHTML = `
        <div class="story-info">
          <div class="story-title" title="נגן סיפור">${story.prompt}</div>
          <div class="story-date">נוצר ב: ${story.date}</div>
        </div>
        <button class="delete-btn" title="מחק סיפור">🗑️</button>
      `;
      historyList.appendChild(li);
    });
  }

  historyList.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    const id = li.dataset.id;
    if (e.target.classList.contains("delete-btn")) {
      deleteStory(id);
    } else {
      playStory(id);
    }
  });

  function playStory(id) {
    const story = getHistory().find((s) => s.id == id);
    if (story) {
      displayStory(story.audioDataUrl, story.prompt);
    }
  }

  function deleteStory(id) {
    const history = getHistory().filter((s) => s.id != id);
    localStorage.setItem("storyHistory", JSON.stringify(history));
    renderHistory();
  }

  exampleBtns.forEach((btn) =>
    btn.addEventListener("click", () => {
      promptTextarea.value = btn.textContent;
    })
  );

  initializeApp();
});
ml>

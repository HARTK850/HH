// script.js
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    // הגדרת אלמנטים
    const apiKeySection = document.getElementById('api-key-section');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const toggleApiKeyVisibilityBtn = document.getElementById('toggle-api-key-visibility');
    
    const mainContent = document.getElementById('main-content');
    
    const storyForm = document.getElementById('story-form');
    const promptTextarea = document.getElementById('story-prompt');
    const createBtn = document.getElementById('create-btn');
    const btnText = createBtn.querySelector('.btn-text');
    const loader = createBtn.querySelector('.loader');
    const statusText = createBtn.querySelector('.status-text');
    const exampleBtns = document.querySelectorAll('.example-btn');
    
    const playerSection = document.getElementById('story-player-section');
    const storyPlayer = document.getElementById('story-player');
    const downloadBtn = document.getElementById('download-btn');
    
    const historyList = document.getElementById('history-list');

    let genAI;

    // --- הגדרת אייקונים להצגת/הסתרת סיסמה ---
    const eyeIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>;
    const eyeOffIcon = <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" x2="22" y1="2" y2="22"></line></svg>;

    // פונקציית אתחול - בודקת אם קיים מפתח API
    function initializeApp() {
        toggleApiKeyVisibilityBtn.innerHTML = eyeIcon; // הצבת האייקון הראשוני
        const apiKey = localStorage.getItem('googleApiKey');
        if (apiKey) {
            try {
                genAI = new GoogleGenerativeAI(apiKey);
                apiKeySection.style.display = 'none';
                mainContent.style.display = 'block';
                loadHistory();
            } catch (error) {
                console.error("Error initializing GoogleGenerativeAI:", error);
                localStorage.removeItem('googleApiKey');
                showApiKeySection();
            }
        } else {
            showApiKeySection();
        }
    }

    function showApiKeySection() {
        apiKeySection.style.display = 'block';
        mainContent.style.display = 'none';
    }

    // --- לוגיקה חדשה: הצגה והסתרה של מפתח ה-API ---
    toggleApiKeyVisibilityBtn.addEventListener('click', () => {
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            toggleApiKeyVisibilityBtn.innerHTML = eyeOffIcon;
        } else {
            apiKeyInput.type = 'password';
            toggleApiKeyVisibilityBtn.innerHTML = eyeIcon;
        }
    });

    // שמירת מפתח ה-API ומעבר לאזור היצירה
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            try {
                new GoogleGenerativeAI(apiKey);
                localStorage.setItem('googleApiKey', apiKey);
                initializeApp();
                // גלילה חלקה למטה לאחר המעבר
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
            } catch (e) {
                alert("נראה שמפתח ה-API אינו תקין. אנא בדוק אותו ונסה שוב.");
            }
        } else {
            alert('אנא הזן מפתח API.');
        }
    });

    // טיפול בשליחת הטופס
    storyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userPrompt = promptTextarea.value.trim();
        if (!userPrompt) {
            alert('אנא הזן נושא לסיפור.');
            return;
        }
        await generateStory(userPrompt);
    });
    
    // פונקציה ראשית ליצירת סיפור
    async function generateStory(userPrompt) {
        if (!genAI) {
            alert("מפתח ה-API אינו מוגדר. אנא הגדר אותו.");
            return;
        }

        toggleLoading(true, "יוצר תסריט...");

        try {
            // שלב 1: יצירת תסריט
            const scriptGenerationModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
            
            // --- שינוי: הנחיה חדשה ללא הגבלת דמויות ---
            const generationPrompt = 
                אתה תסריטאי מומחה לדיאלוגים קצרים בעברית בלבד.
                בהינתן הנושא: "${userPrompt}", בצע את המשימות הבאות:
                1. החלט על מספר הדמויות המתאים ביותר לסיפור, ללא הגבלה.
                2. כתוב דיאלוג קצר וקולע ביניהן.
                3. הצג את הפלט בפורמט הבא בלבד: כל שורה מתחילה ב"דובר 1:", "דוברת 2:" וכו'.
                4. אל תוסיף שום טקסט, כותרות או הסברים לפני או אחרי הדיאלוג.
            ;
            const scriptResult = await scriptGenerationModel.generateContent(generationPrompt);
            const scriptText = await scriptResult.response.text();

            // שלב 2: יצירת קובץ שמע
            toggleLoading(true, "מפיק קובץ שמע...");
            const ttsModel = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash-preview-0514",
                generationConfig: { responseMimeType: "audio/mpeg" }
            });

            const ttsPrompt = צור קובץ שמע מהטקסט הבא, עם קולות שונים לכל דובר: ${scriptText};
            const ttsResult = await ttsModel.generateContent(ttsPrompt);
            
            const audioBase64 = ttsResult.response.parts[0].inlineData.data;
            const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);

            displayStory(audioUrl, userPrompt);
            saveStoryToHistory(userPrompt, audioBlob);

        } catch (error) {
            console.error('Error generating story:', error);
            alert(אופס, משהו השתבש ביצירת הסיפור: ${error.message});
        } finally {
            toggleLoading(false);
        }
    }

    function base64ToBlob(base64, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }

    exampleBtns.forEach(btn => btn.addEventListener('click', () => { promptTextarea.value = btn.textContent; }));

    historyList.addEventListener('click', (e) => {
        const target = e.target;
        const storyItem = target.closest('li');
        if (!storyItem) return;
        const storyId = storyItem.dataset.id;
        if (target.closest('.story-info')) playStoryFromHistory(storyId);
        else if (target.closest('.delete-btn')) deleteStoryFromHistory(storyId);
    });

    function displayStory(audioUrl, prompt) {
        playerSection.style.display = 'block';
        storyPlayer.src = audioUrl;
        storyPlayer.play();
        downloadBtn.href = audioUrl;
        downloadBtn.download = פשוט_סיפור_${prompt.slice(0, 15).replace(/ /g, '_')}.mp3;
        playerSection.scrollIntoView({ behavior: 'smooth' });
    }

    function saveStoryToHistory(prompt, audioBlob) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const story = {
                id: Date.now(),
                prompt: prompt,
                date: new Date().toLocaleString('he-IL'),
                audioDataUrl: event.target.result
            };
            let history = getHistory();
            history.unshift(story);
            localStorage.setItem('storyHistory', JSON.stringify(history.slice(0, 20)));
            renderHistory();
        };
        reader.readAsDataURL(audioBlob);
    }
    
    function getHistory() { return JSON.parse(localStorage.getItem('storyHistory')) || []; }
    function loadHistory() { renderHistory(); }
    
    function renderHistory() {
        const history = getHistory();
        historyList.innerHTML = '';
        if (history.length === 0) {
            historyList.innerHTML = '<li class="empty-history">אין סיפורים שמורים עדיין.</li>';
        } else {
            history.forEach(story => {
                const li = document.createElement('li');
                li.dataset.id = story.id;
                li.innerHTML = 
                    <div class="story-info">
                        <div class="story-title" title="לחץ לניגון">${story.prompt}</div>
                        <div class="story-date">נוצר ב: ${story.date}</div>
                    </div>
                    <button class="delete-btn" title="מחק סיפור">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                ;
                historyList.appendChild(li);
            });
        }
    }

    function playStoryFromHistory(id) {
        const story = getHistory().find(s => s.id == id);
        if (story) {
            displayStory(story.audioDataUrl, story.prompt);
        }
    }

    function deleteStoryFromHistory(id) {
        let history = getHistory().filter(s => s.id != id);
        localStorage.setItem('storyHistory', JSON.stringify(history));
        renderHistory();
    }

    function toggleLoading(isLoading, statusMsg = "") {
        if (isLoading) {
            createBtn.disabled = true;
            btnText.style.display = 'none';
            loader.style.display = 'inline-block';
            statusText.textContent = statusMsg;
            statusText.style.display = 'inline-block';
        } else {
            createBtn.disabled = false;
            btnText.style.display = 'inline';
            loader.style.display = 'none';
            statusText.style.display = 'none';
        }
    }

    initializeApp();
});

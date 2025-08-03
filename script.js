const url = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const result = document.getElementById("result");
const sound = document.getElementById("sound");
const btn = document.getElementById("search-btn");
const inpWord = document.getElementById("inp-word");
const suggestions = document.getElementById("suggestions");
const loading = document.getElementById("loading");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");
const infoBtn = document.getElementById("info-btn");
const infoModal = document.getElementById("info-modal");
const closeModal = document.querySelector(".close-modal");

const currentTheme = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", currentTheme);
updateThemeIcon();

themeToggle.addEventListener("click", toggleTheme);

infoBtn.addEventListener("click", () => {
    infoModal.style.display = "flex";
});

closeModal.addEventListener("click", () => {
    infoModal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === infoModal) {
        infoModal.style.display = "none";
    }
});

clearBtn.addEventListener("click", () => {
    inpWord.value = "";
    inpWord.focus();
    suggestions.style.display = "none";
    showWelcomeMessage();
});

function debounce(func, delay) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const icon = themeToggle.querySelector("i");
    icon.className = currentTheme === "light" ? "fas fa-moon" : "fas fa-sun";
}
function showLoading() {
    loading.style.display = "flex";
    result.style.display = "none";
    suggestions.style.display = "none";
}
function hideLoading() {
    loading.style.display = "none";
}
function showWelcomeMessage() {
    result.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to LexiQuest</h2>
            <p>Type any word to discover its meaning, pronunciation, and usage examples.</p>
            <div class="quick-tips">
                <h3>Quick Tips:</h3>
                <ul>
                     <li><i class="fas fa-volume-up"></i> Listen to accurate pronunciations</li>
                    <li><i class="fas fa-layer-group"></i> Explore multiple meanings</li>
                    <li><i class="fas fa-check-circle"></i> Get automatic spelling help</li>
                    <li><i class="fas fa-exchange-alt"></i> Switch between light/dark mode</li>
                    <li><i class="fas fa-clock"></i> View your recent searches</li>
            </div>
        </div>
    `;
    result.style.display = "block";
}

function showSuggestions(words) {
    if (!words || words.length === 0) {
        suggestions.style.display = "none";
        return;
    }
    
    suggestions.innerHTML = words.map(word => 
        `<div class="suggestion-item">${word}</div>`
    ).join('');
    
    suggestions.style.display = "block";
    
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            inpWord.value = this.textContent;
            suggestions.style.display = "none";
            searchWord();
        });
    });
}
async function getSuggestions(word) {
    if (!word) {
        suggestions.style.display = "none";
        showWelcomeMessage();
        return;
    }
    
    try {
        const response = await fetch(`https://api.datamuse.com/sug?s=${word}`);
        const data = await response.json();
        const suggestionsList = data.slice(0, 5).map(item => item.word);
        showSuggestions(suggestionsList);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
        suggestions.style.display = "none";
    }
}
inpWord.addEventListener('input', debounce(function() {
    getSuggestions(this.value.trim());
}, 300));
async function searchWord() {
    const word = inpWord.value.trim();
    if (!word) {
        showWelcomeMessage();
        return;
    }

    showLoading();
    
    try {
        const response = await fetch(`${url}${word}`);
        const data = await response.json();
        
        if (!response.ok) {
            if (data.title === "No Definitions Found") {
                showNoResult(word);
            } else {
                throw new Error(data.message || "Failed to fetch definition");
            }
            return;
        }
        
        displayResult(data[0], word);
    } catch (error) {
        console.error("Error:", error);
        showError();
    } finally {
        hideLoading();
    }
}
function displayResult(data, word) {
    const phonetics = data.phonetics.find(p => p.audio) || {};
    
    if (phonetics.audio) {
        sound.setAttribute("src", phonetics.audio);
    } else {
        sound.removeAttribute("src");
    }
    const meaningsHtml = data.meanings.map(meaning => {
        const definitions = meaning.definitions.slice(0, 5).map((def, idx) => `
            <div class="definition">
                <span class="definition-number">${idx + 1}.</span> ${def.definition}
                ${def.example ? `<div class="example">${def.example}</div>` : ''}
            </div>
        `).join('');
        
        return `
            <div class="meaning-section">
                <div class="part-of-speech">${meaning.partOfSpeech}</div>
                ${definitions}
                ${meaning.synonyms.length ? `
                    <div class="synonyms">
                        <div class="synonyms-title">Synonyms:</div>
                        <div class="synonyms-list">
                            ${meaning.synonyms.slice(0, 8).map(syn => 
                                `<span class="synonym">${syn}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    result.innerHTML = `
        <div class="word-header">
            <div>
                <h2 class="word-title">${word}</h2>
                <div class="phonetic">${data.phonetic || phonetics.text || ''}</div>
            </div>
            ${phonetics.audio ? `
                <button class="play-btn" id="play-sound" aria-label="Play pronunciation">
                    <i class="fas fa-volume-up"></i>
                </button>
            ` : ''}
        </div>
        ${meaningsHtml}
    `;
    
    result.style.display = "block";
    
    if (phonetics.audio) {
        document.getElementById("play-sound").addEventListener("click", playSound);
    }
}
function showError() {
    result.innerHTML = `
        <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>There was an error fetching the definition. Please try again.</p>
        </div>
    `;
    result.style.display = "block";
}

function showNoResult(word) {
    result.innerHTML = `
        <div class="error">
            <i class="fas fa-question-circle"></i>
            <p>No definitions found for "${word}"</p>
            <div class="suggestions-title">Did you mean:</div>
        </div>
    `;
    result.style.display = "block";
    
    getSuggestions(word).then(() => {
        const suggestionItems = document.querySelectorAll('#suggestions .suggestion-item');
        if (suggestionItems.length > 0) {
            const suggestionsContainer = document.createElement('div');
            suggestionsContainer.className = 'suggestions-container';
            
            suggestionItems.forEach(item => {
                const suggestion = document.createElement('div');
                suggestion.className = 'suggestion-item';
                suggestion.textContent = item.textContent;
                suggestion.addEventListener('click', function() {
                    inpWord.value = this.textContent;
                    searchWord();
                });
                suggestionsContainer.appendChild(suggestion);
            });
            
            document.querySelector('.error').appendChild(suggestionsContainer);
        }
    });
}
function playSound() {
    if (sound.src) {
        sound.play().catch(e => console.error("Audio playback failed:", e));
    } else {
        alert("No pronunciation available for this word.");
    }
}

btn.addEventListener("click", searchWord);
inpWord.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        searchWord();
    }
});
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-container')) {
        suggestions.style.display = "none";
    }
});
showWelcomeMessage();
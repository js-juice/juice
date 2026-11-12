import Emitter from "../emitter.mjs";

class VoiceToText extends Emitter {
    lang = "en-US";
    quality = "conversation";
    processLocally = false;
    unspokenPunctuation = true;

    constructor( autoStart = false, lang = "en-US", quality = "conversation", processLocally = false, unspokenPunctuation = true) {
        this.recognition = null;
        this.isListening = false;
        this.onResultCallback = null;
        this.lang = lang; 
        this.quality = quality;
        this.processLocally = processLocally;
        this.unspokenPunctuation = unspokenPunctuation;
        if (autoStart) {
          this.available().then(() => {   
              this.start();
          }).catch((error) => {
              console.error("Speech recognition is not available:", error);
          });
      }
    }

    async install() {
        const langs = [this.lang];
        const quality = this.quality;
        const processLocally = this.processLocally;
        SpeechRecognition.install({
            langs: langs,
            processLocally,
            quality
        }).then((result) => {
            if (result) {
                console.log(`en-US language pack downloaded. Try again.`);
                return this.available(quality, processLocally, langs);
            } else {
                console.log(`en-US language pack failed to download. Try again later.`);
                reject();
            }
        });
    }

    async available(quality = this.quality, processLocally = this.processLocally, langs = [this.lang]) {
        if (!("webkitSpeechRecognition" in window)) {
            return false;
        }

        return new Promise((resolve, reject) => {
            SpeechRecognition.available({
                langs,
                quality,
                processLocally
            }).then(
                (result) => {
                    console.log(result);
                    if (result === "unavailable") {
                        console.error("SpeechRecognition is not available");
                        reject();
                    } else if (result === "available") {
                        recognition.start();
                        console.log("Ready to receive a color command.");
                        resolve();
                    } else {
                        console.error("SpeechRecognition is installing");
                        this.install();
                    }
                },
                (error) => {
                    console.error(error);
                    reject();
                }
            );
        });
    }

    verifyActive() {
        if (!this.recognition) {
            console.error("Recognition is not initialized. Call start() first.");
            return false;
        }
        return true;
    }

    display(container) {
        this.container = container;
    }

    output(transcript) {
        if (this.container) {
            this.container.innerHTML = transcript;
        }
        this.emit("result", transcript);
    }

    addPhrase(phrase. boost) {
      this._phrases = this._phrases || [];
      this._phrases.push({ phrase, boost });     
    }

    configure({ lang, quality, processLocally, unspokenPunctuation }) {
        if (lang) this.lang = lang;
        if (quality) this.quality = quality;
        if (processLocally !== undefined) this.processLocally = processLocally;
        if (unspokenPunctuation !== undefined) this.unspokenPunctuation = unspokenPunctuation;
    }

    start() {
        if (this.recognition) {
            console.warn("Recognition is already started.");
            return;
        }
        const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.lang = this.lang || "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.unspokenPunctuation = this.unspokenPunctuation;
        recognition.processLocally = this.processLocally;
        recognition.quality = this.quality;

        if(this._phrases && this._phrases.length > 0) {
            recognition.phrases = this._phrases.map(p => (p) => new SpeechRecognitionPhrase(p.phrase, p.boost));
        }

        recognition.onstart = () => {
            this.isListening = true;
            this.emit("listening");
            this.emit("start");
            console.log("Voice recognition started. Try speaking into the microphone.");
        };

        recognition.onend = () => {
            this.isListening = false;
            this.emit("end");
            console.log("Voice recognition ended.");
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.output(transcript);
        };

        recognition.onnomatch = () => {
          this.emit("nomatch");
          console.log("No matching speech recognized.");
        };

        recognition.speechstart = () => {
            this.emit("speechstart");
        };

        recognition.onspeechend = () => {
            this.emit("speechend");
        };

        recognition.onerror = (event) => {
            console.error("Error occurred in recognition: " + event.error);
            this.emit("error", event.error);
        };

        recognition.start();
        this.recognition = recognition;
        document.addEventListener("DOMContentLoaded", async () => {});
    }

    stop() {
        if (!this.verifyActive()) return;
        this.recognition.stop();
    }

    abort() {
        if (!this.verifyActive()) return;
        this.recognition.abort();
    }
}

export default VoiceToText;

import Custom from '../core/Dom/Custom.mjs';
import tutorialCSS from '!../../sass/component-tutorial.scss?toString';

class TutorialComponent extends Custom.HTMLElement {

    currentFocus = null;
    taskIndex = 0;
    tasks = [];

    static config = {
        properties: {

        }
    }


    static get style(){
        return [ tutorialCSS ];
    }
    

    renderActions(){
        return ``;
    }

    static html(){
        return `
            <div class="pointer" ref="pointer" ></div>
            <div class="content" >
                <header>
                    <h3 class="task" ref="task" >${this.task?.name || 'Task Name'}</h3>
                </header>
                <main>
                    <div class="directions" ref="directions" >${this.task?.dircetion || 'Directions'}</div>
                </main>
                <footer>
                    <div class="actions">
                        ${ this.renderActions() }
                    </div>
                </footer>
            </div>
        `;
    }


    configure( tasks, options ){
        this.tasks = tasks;
        this.options = options;
    }

    constructor(){
        super();

    }

    next(){
        this.taskIndex++;
        if(this.taskIndex > this.tasks.length) this.taskIndex = this.tasks.length;
        this.loadTask(this.taskIndex);
    }
    

    prev(){
        this.taskIndex--;
        if(this.taskIndex < 0) this.taskIndex = 0;
        this.loadTask(this.taskIndex);
    }
    
    taskState = '';

    highlight( element ){
        //Get Position of Focus Element
        const rect = element.getBoundingClientRect();
        if(this.currentFocus) this.currentFocus.classList.remove('focus');
        this.currentFocus = element;
        this.currentFocus.classList.add('focus');
        this.ref('pointer').style.left = `${this.currentFocus.offsetLeft}`;
    }

    loadTask( index ){
        if(index == this.taskIndex) return;
        this.taskState = 'initial';
        this.taskIndex = index;
        this.task = this.tasks[this.taskIndex].task;
        this.dircetion = this.tasks[this.taskIndex].dircetion;
        this.ref('task').innerHTML = this.task;
        this.ref('directions').innerHTML = this.dircetion;
        this.ref('pointer').style.left = `${this.ref('directions').offsetLeft}`;
    
    }

    show(){
        
    }

    hide(){

    }

    onReady(){
       // this.loadTask(this.taskIndex);
    }

}


customElements.define('tutorial-component', TutorialComponent);
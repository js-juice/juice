import Emitter from '../Event/Emitter.mjs';

class FormHistory extends Emitter{
    
    stack = [];
    form;
    
    constructor( form ){
        super();
        this.form = form;
    }

    push( target, type, value ){
        this.stack.push({ target: target, type: type, value: value });
        if( this.stack.length == 1 ){
            this.emit('notEmpty');
        }
    }

    undo(){
        const action = this.stack.pop();
        if(action.type == 'value'){
            action.target.value = action.value;
        }
        if( this.stack.length == 0 ){
            this.emit('empty');
        }
    }

    reset(){
        this.stack = [];
        this.emit('empty');
    }
}

export default FormHistory;
'use strict';

/* global CloudCmd */
/* global DOM */
const vim = require('./vim');
const finder = require('./find');
const {
    setCurrent,
    selectFileNotParent,
} = require('./set-current');

const {Dialog} = DOM;

const DEPS = {
    ...DOM,
    ...CloudCmd,
};

module.exports = async (key, event, deps = DEPS) => {
    const operations = getOperations(event, deps);
    await vim(key, operations);
};

const getOperations = (event, deps) => {
    const {
        Info = DOM.CurrentInfo,
        Operation,
        unselectFiles,
        setCurrentFile,
        setCurrentByName,
        getCurrentName,
        
        toggleSelectedFile,
                Buffer = {},
    } = deps;
    
    return {
        escape: unselectFiles,
        
        remove: () => {
            Operation.show('delete');
        },
        
        makeDirectory: () => {
            event.stopImmediatePropagation();
            event.preventDefault();
            DOM.promptNewDir();
        },
        
        makeFile: () => {
            event.stopImmediatePropagation();
            event.preventDefault();
            DOM.promptNewFile();
        },
        
        terminal: () => {
            CloudCmd.Terminal.show();
        },
        
        edit: () => {
            CloudCmd.EditFileVim.show();
        },
        
        copy: () => {
            Buffer.copy();
            unselectFiles();
        },
        
        select: () => {
            const current = Info.element;
            toggleSelectedFile(current);
        },
        
        paste: Buffer.paste,
        
        moveNext: ({count, isVisual, isDelete}) => {
            setCurrent('next', {
                count,
                isVisual,
                isDelete,
            }, {
                Info,
                setCurrentFile,
                unselectFiles,
                Operation,
            });
        },
        
        movePrevious: ({count, isVisual, isDelete}) => {
            setCurrent('previous', {
                count,
                isVisual,
                isDelete,
            }, {
                Info,
                setCurrentFile,
                unselectFiles,
                Operation,
            });
        },
        
        find: async () => {
            event.preventDefault();
            const [, value] = await Dialog.prompt('Find', '');
            
            if (!value)
                return;
            
            const names = Info.files.map(getCurrentName);
            const [result] = finder.find(value, names);
            
            setCurrentByName(result);
        },
        
        findNext: () => {
            const name = finder.findNext();
            setCurrentByName(name);
        },
        
        findPrevious: () => {
            const name = finder.findPrevious();
            setCurrentByName(name);
        },
    };
};

module.exports.selectFile = selectFileNotParent;

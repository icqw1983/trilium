const log = require('./log');
const noteService = require('./notes');
const sql = require('./sql');
const utils = require('./utils');
const dateUtils = require('./date_utils');
const attributeService = require('./attributes');
const dateNoteService = require('./date_notes');
const treeService = require('./tree');
const config = require('./config');
const repository = require('./repository');
const axios = require('axios');

function ScriptContext(startNote, allNotes, workEntity = null) {
    this.modules = {};
    this.notes = utils.toObject(allNotes, note => [note.noteId, note]);
    this.apis = utils.toObject(allNotes, note => [note.noteId, new ScriptApi(startNote, note, workEntity)]);
    this.require = moduleNoteIds => {
        return moduleName => {
            const candidates = allNotes.filter(note => moduleNoteIds.includes(note.noteId));
            const note = candidates.find(c => c.title === moduleName);

            if (!note) {
                throw new Error("Could not find module note " + moduleName);
            }

            return this.modules[note.noteId].exports;
        }
    };
}

function ScriptApi(startNote, currentNote, workEntity) {
    this.startNote = startNote;
    this.currentNote = currentNote;
    this.workEntity = workEntity;

    this.axios = axios;

    this.utils = {
        unescapeHtml: utils.unescapeHtml,
        isoDateTimeStr: dateUtils.dateStr,
        isoDateStr: date => dateUtils.dateStr(date).substr(0, 10)
    };

    this.getInstanceName = () => config.General ? config.General.instanceName : null;

    this.getNote = repository.getNote;
    this.getBranch = repository.getBranch;
    this.getAttribute = repository.getAttribute;
    this.getImage = repository.getImage;
    this.getEntity = repository.getEntity;
    this.getEntities = repository.getEntities;

    this.createAttribute = attributeService.createAttribute;
    this.getNotesWithLabel = attributeService.getNotesWithLabel;
    this.getNoteWithLabel = attributeService.getNoteWithLabel;

    this.createNote = noteService.createNote;

    this.log = message => log.info(`Script ${currentNote.noteId}: ${message}`);

    this.getRootCalendarNote = dateNoteService.getRootCalendarNote;
    this.getDateNote = dateNoteService.getDateNote;

    this.sortNotesAlphabetically = treeService.sortNotesAlphabetically;

    this.transactional = sql.transactional;
}

module.exports = ScriptContext;
import treeService from '../services/tree.js';
import treeUtils from "../services/tree_utils.js";
import utils from "../services/utils.js";
import protectedSessionHolder from "../services/protected_session_holder.js";
import messagingService from "../services/messaging.js";
import infoService from "../services/info.js";

const $dialog = $("#export-dialog");
const $form = $("#export-form");
const $noteTitle = $dialog.find(".note-title");
const $subtreeFormats = $("#export-subtree-formats");
const $singleFormats = $("#export-single-formats");
const $subtreeType = $("#export-type-subtree");
const $singleType = $("#export-type-single");
const $exportProgressWrapper = $("#export-progress-count-wrapper");
const $exportProgressCount = $("#export-progress-count");
const $exportButton = $("#export-button");

let exportId = '';

async function showDialog(defaultType) {
    // each opening of the dialog resets the exportId so we don't associate it with previous exports anymore
    exportId = '';
    $exportButton.removeAttr("disabled");
    $exportProgressWrapper.hide();
    $exportProgressCount.text('0');

    if (defaultType === 'subtree') {
        $subtreeType.prop("checked", true).change();
    }
    else if (defaultType === 'single') {
        $singleType.prop("checked", true).change();
    }
    else {
        throw new Error("Unrecognized type " + defaultType);
    }

    glob.activeDialog = $dialog;

    $dialog.modal();

    const currentNode = treeService.getCurrentNode();
    const noteTitle = await treeUtils.getNoteTitle(currentNode.data.noteId);

    $noteTitle.html(noteTitle);
}

$form.submit(() => {
    // disabling so export can't be triggered again
    $exportButton.attr("disabled", "disabled");

    const exportType = $dialog.find("input[name='export-type']:checked").val();

    if (!exportType) {
        // this shouldn't happen as we always choose default export type
        alert("Choose export type first please");
        return;
    }

    const exportFormat = exportType === 'subtree'
        ? $("input[name=export-subtree-format]:checked").val()
        : $("input[name=export-single-format]:checked").val();

    const currentNode = treeService.getCurrentNode();

    exportBranch(currentNode.data.branchId, exportType, exportFormat);

    return false;
});

function exportBranch(branchId, type, format) {
    exportId = utils.randomString(10);

    const url = utils.getHost() + `/api/notes/${branchId}/export/${type}/${format}/${exportId}?protectedSessionId=` + encodeURIComponent(protectedSessionHolder.getProtectedSessionId());

    utils.download(url);
}

$('input[name=export-type]').change(function () {
    if (this.value === 'subtree') {
        if ($("input[name=export-subtree-format]:checked").length === 0) {
            $("input[name=export-subtree-format]:first").prop("checked", true);
        }

        $subtreeFormats.slideDown();
        $singleFormats.slideUp();
    }
    else {
        if ($("input[name=export-single-format]:checked").length === 0) {
            $("input[name=export-single-format]:first").prop("checked", true);
        }

        $subtreeFormats.slideUp();
        $singleFormats.slideDown();
    }
});

messagingService.subscribeToMessages(async message => {
    if (message.type === 'export-error') {
        infoService.showError(message.message);
        $dialog.modal('hide');
        return;
    }

    if (!message.exportId || message.exportId !== exportId) {
        // incoming messages must correspond to this export instance
        return;
    }

    if (message.type === 'export-progress-count') {
        $exportProgressWrapper.slideDown();

        $exportProgressCount.text(message.progressCount);
    }
    else if (message.type === 'export-finished') {
        $dialog.modal('hide');

        infoService.showMessage("Export finished successfully.");
    }
});

export default {
    showDialog
};
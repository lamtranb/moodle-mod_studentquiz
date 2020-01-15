// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/*
 * Control the element in comment area.
 *
 * @package mod_studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @module mod_studentquiz/comment_element
 */
define(['jquery', 'core/str', 'core/ajax', 'core/modal_factory', 'core/templates', 'core/fragment', 'core/modal_events'],
    function($, str, ajax, ModalFactory, Templates, fragment, ModalEvents) {
        var t = {
            EMPTY_CONTENT: ['<br><p><br></p>', '<p><br></p>', '<br>', ''],
            ROOT_COMMENT_VALUE: 0,
            GET_ALL_VALUE: 0,
            TEMPLATE_COMMENTS: 'mod_studentquiz/comments',
            TEMPLATE_COMMENT: 'mod_studentquiz/comment',
            ACTION_CREATE: 'mod_studentquiz_create_comment',
            ACTION_CREATE_REPLY: 'mod_studentquiz_create_reply',
            ACTION_GET_ALL: 'mod_studentquiz_get_comments',
            ACTION_EXPAND: 'mod_studentquiz_expand_comment',
            ACTION_DELETE: 'mod_studentquiz_delete_comment',
            ACTION_LOAD_FRAGMENT_FORM: 'mod_studentquiz_load_fragment_form',
            ACTION_EXPAND_ALL: 'action_expand_all',
            ACTION_COLLAPSE_ALL: 'action_collapse_all',
            ACTION_RENDER_COMMENT: 'action_render_comment',
            ACTION_APPEND_COMMENT: 'action_append_comment',
            FRAGMENT_FORM_CALLBACK: 'commentform',
            SELECTOR: {
                EXPAND_ALL: '.studentquiz-comment-expand',
                COLLAPSE_ALL: '.studentquiz-comment-collapse',
                SUBMIT_BUTTON: '#id_submitbutton',
                CONTAINER_REPLIES: '.studentquiz-container-replies',
                COMMENT_REPLIES_CONTAINER: '.studentquiz-comment-replies',
                COMMENT_COUNT: '.studentquiz-comment-postcount',
                COMMENT_TEXT: '.studentquiz-comment-text',
                COMMENT_REPLIES_TEXT: '.studentquiz-comment-replies .studentquiz-comment-text',
                LOADING_ICON: '.studentquiz-comment-loading',
                COMMENT_AREA_FORM: 'div.comment-area-form',
                FORM_SELECTOR: '.studentquiz-comment-postform > div.comment-area-form',
                NO_COMMENT: '.no-comment',
                COLLAPSE_LINK: '.studentquiz-comment-collapselink',
                EXPAND_LINK: '.studentquiz-comment-expandlink',
                COMMENT_ITEM: '.studentquiz-comment-item',
                COMMENT_REPLIES_CONTAINER_TO_ITEM: '.studentquiz-comment-replies .studentquiz-comment-item',
                FRAGMENT_FORM: '.studentquiz-comment-postfragmentform',
                BTN_DELETE: '.studentquiz-comment-btndelete',
                BTN_REPLY: '.studentquiz-comment-btnreply',
                BTN_DELETE_REPLY: '.studentquiz-comment-btndeletereply',
                ATTO_EDITOR_WRAP: '.editor_atto_wrap',
                TEXTAREA: 'textarea[id^="id_editor_question_"]',
                COMMENT_COUNT_NUMBER: '.studentquiz-comment-count-number',
                COMMENT_COUNT_TEXT: '.studentquiz-comment-count-text',
                ATTO: {
                    CONTENT_WRAP: '.editor_atto_content_wrap',
                    CONTENT: '.editor_atto_content',
                    TOOLBAR: '.editor_atto_toolbar'
                },
                COMMENT_ID: '#comment_',
                // Is used when server render. We need to collect some stored data attributes to load events.
                SPAN_COMMENT_ID: '#c',
                TOTAL_REPLY: '.studentquiz-comment-totalreply',
                COMMENT_FILTER: '.studentquiz-comment-filter',
                COMMENT_FILTER_HIDE: '.hide-comment-filter',
                COMMENT_ERROR: '.studentquiz-comment-container .comment-error'
            },
            get: function() {
                return {
                    elementSelector: null,
                    btnExpandAll: null,
                    btnCollapseAll: null,
                    addComment: null,
                    containerSelector: null,
                    questionId: null,
                    dialogue: null,
                    loadingIcon: null,
                    lastFocusElement: null,
                    formSelector: null,
                    contextId: null,
                    userId: null,
                    string: {},
                    deleteDialog: null,
                    postToDelete: null,
                    hasExpanded: false,
                    // Checked before placeholder is set.
                    canAddPlaceHolder: true,
                    numberToShow: 5,
                    cmId: null,
                    countServerData: [],
                    lastCurrentCount: 0,
                    lastTotal: 0,
                    expand: false,
                    textareaPlaceholder: '',
                    forceCommenting: false,
                    canViewDeleted: false,

                    /**
                     * Init function.
                     *
                     * @param {Object} params
                     */
                    init: function(params) {
                        var self = this;
                        // Assign attribute.
                        self.elementSelector = $('#' + $.escapeSelector(params.id));
                        var el = self.elementSelector;

                        self.btnExpandAll = el.find(t.SELECTOR.EXPAND_ALL);
                        self.btnCollapseAll = el.find(t.SELECTOR.COLLAPSE_ALL);
                        self.addComment = el.find(t.SELECTOR.SUBMIT_BUTTON);
                        self.containerSelector = el.find(t.SELECTOR.CONTAINER_REPLIES);
                        self.loadingIcon = el.find(t.SELECTOR.LOADING_ICON);
                        self.formSelector = el.find(t.SELECTOR.FORM_SELECTOR);

                        self.questionId = parseInt(params.questionid);
                        self.contextId = parseInt(params.contextid);
                        self.userId = parseInt(params.userid);
                        self.numberToShow = parseInt(params.numbertoshow);
                        self.cmId = parseInt(params.cmid);

                        self.countServerData = {
                            count: params.count,
                            total: params.total
                        };

                        self.expand = params.expand || false;
                        self.textareaPlaceholder = self.formSelector.attr('data-textarea-placeholder');

                        // Get all language string.
                        self.string = params.strings;
                        self.forceCommenting = params.forcecommenting;
                        self.canViewDeleted = params.canviewdeleted;

                        this.initServerRender();
                        this.bindEvents();
                    },

                    /**
                     * Init for server rendering.
                     */
                    initServerRender: function() {
                        var self = this;
                        $(t.SELECTOR.COMMENT_ITEM).each(function() {
                            var id = $(this).data('id');
                            var attrs = $(this).find(t.SELECTOR.SPAN_COMMENT_ID + id);
                            var replies = [];
                            if (self.expand) {
                                replies = attrs.data('replies') || [];
                            }
                            var comment = {
                                id: $(this).data('id'),
                                deleted: attrs.data('deleted'),
                                numberofreply: attrs.data('numberofreply'),
                                expanded: self.expand,
                                replies: replies,
                                root: true,
                                authorid: attrs.data('authorid')
                            };
                            self.bindCommentEvent(comment);
                        });
                        self.changeWorkingState(true);
                        self.initBindEditor();
                        self.updateCommentCount(self.countServerData.count.commentcount, self.countServerData.total);
                        self.btnExpandAll.show();
                        self.changeWorkingState(false);
                    },

                    /**
                     * Init comment editor.
                     */
                    initBindEditor: function() {
                        var self = this;
                        // Interval to init atto editor, there are time when Atto's Javascript slow to init the editor, so we
                        // check interval here to make sure the Atto is init before calling our script.
                        var interval = setInterval(function() {
                            if (self.formSelector.find(t.SELECTOR.ATTO.CONTENT).length !== 0) {
                                self.initAttoEditor(self.formSelector);
                                self.bindEditorEvent(self.formSelector);
                                clearInterval(interval);
                            }
                        }, 500);
                    },

                    /**
                     * Bind events: "Expand all comments", "Collapse all comments", "Add Reply".
                     */
                    bindEvents: function() {
                        var self = this;
                        // Bind event to "Expand all comments" button.
                        self.btnExpandAll.click(function(e) {
                            e.preventDefault();
                            M.util.js_pending(t.ACTION_EXPAND_ALL);
                            self.changeWorkingState(true);
                            // Empty the replies section to append new response.
                            self.containerSelector.empty();
                            // Change button from expand to collapse collapse and disabled button since we don't want user to
                            // press the button when javascript is appending item or ajax is working.
                            self.btnExpandAll.hide();
                            self.btnCollapseAll.show();
                            self.loadingIcon.show();
                            self.getComments(t.GET_ALL_VALUE).then(function(response) {
                                // Calculate length to display count.
                                var count = self.countCommentAndReplies(response.data);
                                var total = count.total;
                                self.updateCommentCount(total, response.total);
                                self.renderComment(response.data, true);
                                M.util.js_complete(t.ACTION_EXPAND_ALL);
                            }).fail(function(err) {
                                M.util.js_complete(t.ACTION_EXPAND_ALL);
                                self.showError(err.message);
                            });
                        });

                        // Bind event to "Collapse all comments" button.
                        self.btnCollapseAll.click(function(e) {
                            e.preventDefault();
                            M.util.js_pending(t.ACTION_COLLAPSE_ALL);
                            self.changeWorkingState(true);
                            self.loadingIcon.show();
                            self.btnCollapseAll.hide();
                            self.btnExpandAll.show();
                            self.containerSelector[0].innerHTML = '';
                            self.getComments(self.numberToShow).then(function(response) {
                                // Calculate length to display the post count.
                                var count = self.countCommentAndReplies(response.data);
                                var commentCount = count.commentCount;
                                var deletedComments = count.totalDelete;
                                // Only show expand button and count if comment existed.
                                if (commentCount !== 0 || deletedComments !== 0) {
                                    self.btnExpandAll.show();
                                    self.updateCommentCount(commentCount, response.total);
                                    self.renderComment(response.data, false);
                                } else {
                                    // No comment found hide loading icon.
                                    self.loadingIcon.hide();
                                    self.changeWorkingState(false);
                                    self.updateCommentCount(0, 0);
                                }
                                M.util.js_complete(t.ACTION_COLLAPSE_ALL);
                            }).fail(function(err) {
                                M.util.js_complete(t.ACTION_COLLAPSE_ALL);
                                self.showError(err.message);
                            });
                        });

                        // Bind event to "Add Reply" button (Root comment).
                        self.addComment.click(function() {
                            M.util.js_pending(t.ACTION_CREATE);
                            self.changeWorkingState(true);
                            self.loadingIcon.show();
                            // Hide error if exists.
                            $(t.SELECTOR.COMMENT_ERROR).hide();
                            // Hide no comment.
                            $(t.SELECTOR.NO_COMMENT).hide();
                            var rootId = t.ROOT_COMMENT_VALUE;
                            var unique = self.questionId + '_' + rootId;
                            var formSelector = self.formSelector;
                            var formData = self.convertFormToJson(formSelector);
                            // Check message field.
                            if (formData['message[text]'].length === 0) {
                                // Show message, atto won't auto show after second form is appended.
                                var attoWrap = formSelector.find(t.SELECTOR.ATTO_EDITOR_WRAP);
                                if (attoWrap.length !== 0 && !attoWrap.hasClass('error')) {
                                    attoWrap.addClass('error');
                                    attoWrap.prepend('<span class="error" tabindex="0">' + self.string.required + '</span>');
                                }
                                return false;
                            }
                            var params = {
                                replyto: rootId,
                                message: {
                                    text: formData['message[text]'],
                                    format: formData['message[format]'],
                                },
                            };
                            self.createComment(params).then(function(response) {
                                // Clear form in setTimeout to prevent require message still shown when reset on Firefox.
                                setTimeout(function() {
                                    // Clear form data.
                                    formSelector.trigger('reset');
                                    // Clear atto editor data.
                                    formSelector.find('#id_editor_question_' + unique + 'editable').empty();
                                });
                                // Add empty array to prevent warning message.
                                response.replies = [];
                                // Disable post reply button since content is now empty.
                                formSelector.find(t.SELECTOR.SUBMIT_BUTTON).addClass('disabled');
                                self.appendComment(response, self.elementSelector.find(t.SELECTOR.CONTAINER_REPLIES));
                                M.util.js_complete(t.ACTION_CREATE);
                                return true;
                            }).fail(function(e) {
                                self.handleFailWhenCreateComment(e, params);
                                M.util.js_complete(t.ACTION_CREATE);
                            });
                            return true;
                        });
                    },

                    /**
                     * Get comments, nubmertoshow = 0 will get all comment + replies.
                     *
                     * @param {Integer} numberToShow
                     * @returns {Promise}
                     */
                    getComments: function(numberToShow) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            numbertoshow: numberToShow
                        });
                        var promise = ajax.call([{
                            methodname: t.ACTION_GET_ALL,
                            args: params
                        }]);
                        return promise[0];
                    },

                    /**
                     * Always map questionId and cmId to request before send.
                     *
                     * @param {Object} params
                     * @returns {Object}
                     */
                    getParamsBeforeCallApi: function(params) {
                        var self = this;
                        params.questionid = self.questionId;
                        params.cmid = self.cmId;
                        return params;
                    },

                    /**
                     * Show error which call showDialog().
                     *
                     * @param {String} message
                     */
                    showError: function(message) {
                        var self = this;
                        // Get error string for title.
                        $.when(self.string.error).done(function(string) {
                            self.showDialog(string, message);
                            self.changeWorkingState(false);
                        });
                    },

                    /**
                     * Show the dialog with custom title and body.
                     *
                     * @param {String} title
                     * @param {String} body
                     */
                    showDialog: function(title, body) {
                        var self = this;
                        var dialogue = self.dialogue;
                        if (dialogue) {
                            // This dialog is existed, only change title and body and then display.
                            dialogue.title.html(title);
                            dialogue.body.html(body);
                            dialogue.show();
                        } else {
                            // This is the first time show the dialog, get the dialog then save it for later.
                            ModalFactory.create({
                                type: ModalFactory.types.CANCEL,
                                title: title,
                                body: body
                            }).done(function(modal) {
                                dialogue = modal;
                                // Display the dialogue.
                                dialogue.show();
                                modal.getRoot().on(ModalEvents.hidden, {}, function() {
                                    location.reload();
                                });
                            });
                        }
                    },

                    /**
                     * Update the comments count on UI, of second parameter is not set then use the last value.
                     *
                     * @param {Integer|NULL} current
                     * @param {Integer|NULL} total
                     */
                    updateCommentCount: function(current, total) {
                        var self = this;

                        // If total parameter is not set, use the old value.
                        if (total === -1) {
                            total = self.lastTotal;
                        } else {
                            self.lastTotal = total;
                        }

                        // If current parameter is not set, use the old value.
                        if (current === -1) {
                            current = self.lastCurrentCount;
                        } else {
                            self.lastCurrentCount = current;
                        }

                        // Get the postof local string and display.
                        var s = str.get_string('current_of_total', 'studentquiz', {
                            current: current,
                            total: total
                        });

                        var noCommentSelector = $(t.SELECTOR.NO_COMMENT);
                        var filter = $(t.SELECTOR.COMMENT_FILTER);
                        var emptyReplies = self.checkEmptyElement($(t.SELECTOR.COMMENT_REPLIES_CONTAINER));
                        // Note: Admin will see deleted comments. Make sure replies container is empty.
                        if (self.lastCurrentCount === 0 && emptyReplies) {
                            $(t.SELECTOR.COMMENT_REPLIES_CONTAINER).hide();
                            filter.hide();
                            noCommentSelector.show();
                        } else {
                            $(t.SELECTOR.COMMENT_REPLIES_CONTAINER).show();
                            noCommentSelector.hide();
                            filter.show();
                        }

                        $.when(s).done(function(text) {
                            self.elementSelector.find(t.SELECTOR.COMMENT_COUNT).text(text);
                        });
                    },

                    /**
                     * Request template then append it into the page.
                     *
                     * @param {Array} comments
                     * @param {Boolean} expanded
                     * @returns {Boolean}
                     */
                    renderComment: function(comments, expanded) {
                        var self = this;
                        M.util.js_pending(t.ACTION_RENDER_COMMENT);
                        comments = self.convertForTemplate(comments, expanded);
                        Templates.render(t.TEMPLATE_COMMENTS, {
                            comments: comments
                        }).done(function(html) {
                            // We render a lot of data, pure js here.
                            self.containerSelector[0].innerHTML = html;
                            // Turn off loading to show raw html first, then we bind events.
                            self.loadingIcon.hide();
                            // Loop to bind event.
                            for (var i = 0; i < comments.length; i++) {
                                self.bindCommentEvent(comments[i]);
                            }
                            self.changeWorkingState(false);
                            M.util.js_complete(t.ACTION_RENDER_COMMENT);
                        });
                        return false;
                    },

                    /**
                     * Bind event to comment: report, reply, expand, collapse button.
                     *
                     * @param {Object} data
                     */
                    bindCommentEvent: function(data) {
                        var self = this;
                        // Loop comments and replies to get id and bind event for button inside it.
                        var el = self.containerSelector.find(t.SELECTOR.COMMENT_ID + data.id);
                        var i = 0;
                        for (i; i < data.replies.length; i++) {
                            var reply = data.replies[i];
                            self.bindReplyEvent(reply, el);
                        }
                        el.find(t.SELECTOR.BTN_DELETE).click(function(e) {
                            self.bindDeleteEvent(data);
                            e.preventDefault();
                        });
                        el.find(t.SELECTOR.BTN_REPLY).click(function(e) {
                            e.preventDefault();
                            self.getFragmentFormReplyEvent(data);
                        });
                        el.find(t.SELECTOR.EXPAND_LINK).click(function(e) {
                            e.preventDefault();
                            self.bindExpandEvent(data);
                        });
                        el.find(t.SELECTOR.COLLAPSE_LINK).click(function(e) {
                            e.preventDefault();
                            self.bindCollapseEvent(data);
                        });
                    },

                    /**
                     * Bind event to reply's report and edit button.
                     *
                     * @param {Object} reply
                     * @param {jQuery} el
                     */
                    bindReplyEvent: function(reply, el) {
                        var self = this;
                        var replySelector = el.find(t.SELECTOR.COMMENT_ID + reply.id);
                        replySelector.find(t.SELECTOR.BTN_DELETE_REPLY).click(function(e) {
                            self.bindDeleteEvent(reply);
                            e.preventDefault();
                        });
                    },

                    /**
                     * This function will disable/hide or enable/show when called depending on the working parameter.
                     * Should call this function when we are going to perform the heavy operation like calling web service,
                     * get render template, its will disabled button to prevent user from perform another action when page
                     * is loading.
                     * "working" is boolean parameter "true" will disable/hide "false" will enable/show.
                     *
                     * @param {Boolean} boolean
                     */
                    changeWorkingState: function(boolean) {
                        var visibility = boolean ? 'hidden' : 'visible';
                        var self = this;
                        self.btnExpandAll.prop('disabled', boolean);
                        self.btnCollapseAll.prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_REPLY).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_DELETE).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_DELETE_REPLY).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.EXPAND_LINK).css('visibility', visibility);
                        self.elementSelector.find(t.SELECTOR.COLLAPSE_LINK).css('visibility', visibility);
                        if (self.deleteDialog) {
                            self.deleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', boolean);
                        }
                        if (boolean) {
                            self.addComment.prop('disabled', boolean);
                        } else {
                            if (self.lastFocusElement) {
                                self.lastFocusElement.focus();
                                self.lastFocusElement = null;
                            }
                        }
                    },

                    /**
                     * Count comments, deleted comments and replies.
                     *
                     * @param {*} data
                     * @returns {{
                     * deleteReplyCount: number,
                     * total: number,
                     * replyCount: number,
                     * totalDelete: number,
                     * deleteCommentCount: number,
                     * commentCount: number
                     * }}
                     */
                    countCommentAndReplies: function(data) {
                        var commentCount = 0;
                        var deleteCommentCount = 0;
                        var replyCount = 0;
                        var deleteReplyCount = 0;

                        if (data.constructor !== Array) {
                            data = [data];
                        }

                        for (var i = 0; i < data.length; i++) {
                            var item = data[i];
                            if (item.deletedtime == 0) {
                                commentCount++;
                            } else {
                                deleteCommentCount++;
                            }
                            for (var j = 0; j < item.replies.length; j++) {
                                var reply = item.replies[j];
                                if (reply.deletedtime == 0) {
                                    replyCount++;
                                } else {
                                    deleteReplyCount++;
                                }
                            }
                        }
                        return {
                            total: commentCount + replyCount,
                            totalDelete: deleteCommentCount + deleteReplyCount,
                            commentCount: commentCount,
                            deleteCommentCount: deleteCommentCount,
                            replyCount: replyCount,
                            deleteReplyCount: deleteReplyCount
                        };
                    },

                    /**
                     * Call web service to info of comment and its replies.
                     *
                     * @param {Integer} id
                     * @returns {Promise}
                     */
                    expandComment: function(id) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            commentid: id
                        });
                        var promise = ajax.call([{
                            methodname: t.ACTION_EXPAND,
                            args: params
                        }]);
                        return promise[0];
                    },

                    /**
                     * Expand event handler.
                     *
                     * @param {Object} item
                     */
                    bindExpandEvent: function(item) {
                        var self = this;
                        var itemSelector = self.elementSelector.find(t.SELECTOR.COMMENT_ID + item.id);
                        var key = t.ACTION_EXPAND;
                        M.util.js_pending(key);
                        self.changeWorkingState(true);
                        // Clone loading icon selector then append into replies section.
                        var loadingIcon = self.loadingIcon.clone().show();
                        itemSelector.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).append(loadingIcon);
                        $(self).hide();
                        // Call expand post web service to get replies.
                        self.expandComment(item.id).then(function(response) {
                            var convertedItem = self.convertForTemplate(response, true);

                            // Count current reply displayed, because user can reply to this comment then press expanded.
                            var currentDisplayComment = itemSelector.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER_TO_ITEM).length;

                            // Update count, handle the case when another user add post then current user expand.
                            var total = self.countCommentAndReplies(convertedItem).replyCount;
                            var newCount = self.lastCurrentCount + total - currentDisplayComment;
                            var newTotalCount = self.lastTotal + (convertedItem.numberofreply - item.numberofreply);

                            if (item.deleted && !convertedItem.deleted) {
                                newCount++;
                                newTotalCount++;
                            }

                            // Normal comment, then deleted by someone else.
                            if (!item.deleted && convertedItem.deleted) {
                                newCount--;
                                newTotalCount--;
                            }

                            // If current show == total mean that all items is shown.
                            if (newCount === newTotalCount) {
                                self.btnExpandAll.hide();
                                self.btnCollapseAll.show();
                            }

                            self.updateCommentCount(newCount, newTotalCount);

                            return Templates.render(t.TEMPLATE_COMMENT, convertedItem).done(function(html) {
                                var el = $(html);
                                itemSelector.replaceWith(el);
                                self.lastFocusElement = el.find(t.SELECTOR.COLLAPSE_LINK);
                                self.bindCommentEvent(response);
                                self.changeWorkingState(false);
                                M.util.js_complete(key);
                                return true;
                            });
                        }).fail(function(e) {
                            M.util.js_complete(key);
                            self.showError(e.message);
                        });
                    },

                    /**
                     * Collapse event handler.
                     *
                     * @param {Object} item
                     */
                    bindCollapseEvent: function(item) {
                        var self = this;

                        var el = self.elementSelector.find(t.SELECTOR.COMMENT_ID + item.id);

                        // Minus the comment currently show, exclude the deleted comment, update main count.
                        // Using DOM to count the reply exclude the deleted, when user delete the reply belong to this comment,
                        // current comment object don't know that, so we using DOM in this case.
                        var commentCount = el.find(t.SELECTOR.COMMENT_REPLIES_TEXT).length;
                        self.updateCommentCount(self.lastCurrentCount - commentCount, -1);
                        // Assign back to comment object in case user then collapse the comment.
                        item.numberofreply = commentCount;

                        // Remove reply for this comment.
                        el.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).empty();

                        // Replace comment content with short content.
                        if (item.deleted) {
                            el.find('.studentquiz-comment-delete-content').html(item.shortcontent);
                        } else {
                            el.find(t.SELECTOR.COMMENT_TEXT).html(item.shortcontent);
                        }

                        // Hide collapse and show expand icon.
                        el.find(t.SELECTOR.COLLAPSE_LINK).hide();
                        el.find(t.SELECTOR.EXPAND_LINK).show().focus();

                        // Update state.
                        item.expanded = false;
                    },

                    /**
                     * Convert for template render.
                     *
                     * @param {*} data
                     * @param {Boolean} expanded
                     * @returns {*}
                     */
                    convertForTemplate: function(data, expanded) {
                        var self = this;
                        var single = false;
                        if (data.constructor !== Array) {
                            data = [data];
                            single = true;
                        }
                        for (var i = 0; i < data.length; i++) {
                            var item = data[i];
                            item.expanded = expanded;
                            item.canviewdeleted = self.canViewDeleted;
                            for (var j = 0; j < item.replies.length; j++) {
                                var reply = item.replies[j];
                                reply.expanded = true;
                                reply.canviewdeleted = self.canViewDeleted;
                            }
                        }
                        return single ? data[0] : data;
                    },

                    /**
                     * Convert form data to Json require for web service.
                     *
                     * @param {jQuery} form
                     * @returns {Object}
                     */
                    convertFormToJson: function(form) {
                        var data = {};
                        form.find(":input").each(function() {
                            var type = $(this).prop("type");
                            var name = $(this).attr('name');
                            // Checked radios/checkboxes.
                            if ((type === "checkbox" || type === "radio") && this.checked
                                || (type !== "button" && type !== "submit")) {
                                data[name] = $(this).val();
                            }
                        });
                        return data;
                    },

                    /**
                     * Call web services to create comment.
                     *
                     * @param {Object} data
                     * @returns {Promise}
                     */
                    createComment: function(data) {
                        var self = this;
                        data = self.getParamsBeforeCallApi(data);
                        var promise = ajax.call([{
                            methodname: t.ACTION_CREATE,
                            args: data
                        }]);
                        return promise[0];
                    },

                    /**
                     * Append comment to the DOM, and call another function to bind the event into it.
                     *
                     * @param {Object} item
                     * @param {jQuery} target
                     * @param {Boolean} isReply
                     */
                    appendComment: function(item, target, isReply) {
                        var self = this;
                        M.util.js_pending(t.ACTION_APPEND_COMMENT);
                        item.root = !isReply;
                        item.expanded = true;
                        Templates.render(t.TEMPLATE_COMMENT, item).done(function(html) {
                            var el = $(html);
                            target.append(el);
                            if (!self.lastCurrentCount) {
                                // This is the first reply.
                                $(t.SELECTOR.COMMENT_FILTER).removeClass(t.SELECTOR.COMMENT_FILTER_HIDE);
                                self.updateCommentCount(1, 1);
                                self.btnExpandAll.prop('disabled', true);
                                self.btnExpandAll.hide();
                                self.btnCollapseAll.prop('disabled', false);
                                self.btnCollapseAll.show();
                                self.expand = true;
                            } else {
                                self.updateCommentCount(self.lastCurrentCount + 1, self.lastTotal + 1);
                            }
                            if (isReply) {
                                self.bindReplyEvent(item, el.parent());
                            } else {
                                self.bindCommentEvent(item);
                            }
                            self.loadingIcon.hide();
                            self.changeWorkingState(false);
                            M.util.js_complete(t.ACTION_APPEND_COMMENT);
                        });
                    },

                    /*
                    * Call web services to get the fragment form, append to the DOM then bind event.
                    * */
                    loadFragmentForm: function(fragmentForm, item) {
                        var self = this;
                        var key = t.ACTION_LOAD_FRAGMENT_FORM;
                        M.util.js_pending(key);
                        var params = self.getParamsBeforeCallApi({
                            replyto: item.id,
                            cancelbutton: true,
                            forcecommenting: self.forceCommenting
                        });
                        // Clear error message on the main form to prevent Atto editor from focusing to old message.
                        var attoWrap = self.formSelector.find(t.SELECTOR.ATTO_EDITOR_WRAP);
                        if (attoWrap.length !== 0 && attoWrap.hasClass('error')) {
                            attoWrap.removeClass('error');
                            attoWrap.find('#id_error_message_5btext_5d').remove();
                        }
                        fragment.loadFragment(
                            'mod_studentquiz',
                            t.FRAGMENT_FORM_CALLBACK,
                            self.contextId,
                            params
                        ).done(function(html, js) {
                            Templates.replaceNodeContents(fragmentForm, html, js);
                            // Focus form reply.
                            var textFragmentFormId = '#id_editor_question_' + self.questionId + '_' + item.id + 'editable';
                            fragmentForm.find(textFragmentFormId).focus();
                            self.bindFragmentFormEvent(fragmentForm, item);
                            M.util.js_complete(key);
                        });
                    },

                    /*
                    * Bind fragment form action button event like "Reply" or "Save changes".
                    * */
                    bindFragmentFormEvent: function(fragmentForm, item) {
                        var self = this;
                        var formFragmentSelector = fragmentForm.find(t.SELECTOR.COMMENT_AREA_FORM);
                        fragmentForm.find(t.SELECTOR.SUBMIT_BUTTON).click(function() {
                            self.changeWorkingState(true);
                            var data = self.convertFormToJson(formFragmentSelector);
                            // Check message field.
                            if (data['message[text]'].length === 0) {
                                return true; // Return true to trigger form validation and show error messages.
                            }
                            var clone = self.loadingIcon.clone().show();
                            clone.appendTo(fragmentForm);
                            formFragmentSelector.hide();
                            self.createReplyComment(fragmentForm, item, formFragmentSelector, data);
                            return true;
                        });
                        self.fragmentFormCancelEvent(formFragmentSelector);
                        self.bindEditorEvent(fragmentForm);
                    },

                    /*
                    * Call web services to create reply, update parent comment count, remove the fragment form.
                    * */
                    createReplyComment: function(replyContainer, item, formSelector, formData) {
                        var self = this;
                        var params = {
                            replyto: item.id,
                            message: {
                                text: formData['message[text]'],
                                format: formData['message[format]'],
                            }
                        };
                        M.util.js_pending(t.ACTION_CREATE_REPLY);
                        self.createComment(params).then(function(response) {
                            // Hide error if exists.
                            $(t.SELECTOR.COMMENT_ERROR).hide();
                            var el = self.elementSelector.find(t.SELECTOR.COMMENT_ID + item.id);
                            var repliesEl = el.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER);

                            // There are case when user delete the reply then add reply then the numberofreply property is
                            // not correct because this comment object does not know the child object is deleted, so we update
                            // comment count using DOM.
                            item.numberofreply++;

                            var numReply = parseInt(el.find(t.SELECTOR.COMMENT_COUNT_NUMBER).text()) + 1;

                            // Update total count.
                            el.find(t.SELECTOR.COMMENT_COUNT_NUMBER).text(numReply);
                            el.find(t.SELECTOR.COMMENT_COUNT_TEXT).html(
                                numReply === 1 ? self.string.reply : self.string.replies
                            );

                            replyContainer.empty();
                            response.replies = [];
                            self.appendComment(response, repliesEl, true);
                            M.util.js_complete(t.ACTION_CREATE_REPLY);
                            return true;
                        }).fail(function(e) {
                            self.handleFailWhenCreateComment(e, params);
                            M.util.js_complete(t.ACTION_CREATE_REPLY);
                        });
                    },

                    handleFailWhenCreateComment: function(e, params) {
                        var self = this;
                        self.showError(e.message);
                        // Remove the fragment form container.
                        var fragmentFormSelector = t.SELECTOR.COMMENT_ID + params.replyto + ' ' + t.SELECTOR.FRAGMENT_FORM;
                        self.elementSelector.find(fragmentFormSelector).empty();
                    },

                    /*
                    * Begin to load the fragment form for reply.
                    * */
                    getFragmentFormReplyEvent: function(item) {
                        var self = this;
                        var el = self.elementSelector.find(t.SELECTOR.COMMENT_ID + item.id);
                        var fragmentForm = el.find(t.SELECTOR.FRAGMENT_FORM).first();
                        var clone = self.loadingIcon.clone().show();
                        fragmentForm.append(clone);
                        self.loadFragmentForm(fragmentForm, item);
                        self.changeWorkingState(true);
                    },

                    /*
                    * Bind fragment form cancel button event.
                    * */
                    fragmentFormCancelEvent: function(formSelector) {
                        var self = this;
                        var cancelBtn = formSelector.find('#id_cancel');
                        cancelBtn.click(function(e) {
                            e.preventDefault();
                            var commentSelector = formSelector.closest(t.SELECTOR.COMMENT_ITEM);
                            self.lastFocusElement = commentSelector.find(t.SELECTOR.BTN_REPLY);
                            self.changeWorkingState(false);
                            formSelector.parent().empty();
                        });
                    },

                    /*
                    * Bind comment delete event.
                    * */
                    bindDeleteEvent: function(data) {
                        var self = this;
                        self.postToDelete = data;
                        if (self.deleteDialog) {
                            // Use the rendered modal.
                            self.deleteDialog.show();
                        } else {
                            // Disabled button to prevent user from double click on button while loading for template
                            // for the first time.
                            self.changeWorkingState(true);
                            ModalFactory.create({
                                type: ModalFactory.types.DEFAULT,
                                title: self.string.deletecomment,
                                body: self.string.confirmdeletecomment,
                                footer: '<button type="button" data-action="yes" title="' +
                                    self.string.deletecomment + '">' + self.string.deletetext + '</button>' +
                                    '<button type="button" data-action="no" title="' + self.string.cancel + '">' +
                                    self.string.cancel + '</button>'
                            }).done(function(modal) {
                                // Save modal for later.
                                self.deleteDialog = modal;

                                // Bind event for cancel button.
                                modal.getFooter().find('button[data-action="no"]').click(function(e) {
                                    e.preventDefault();
                                    modal.hide();
                                });

                                // Bind event for delete button.
                                modal.getFooter().find('button[data-action="yes"]').click(function(e) {
                                    e.preventDefault();
                                    M.util.js_pending(t.ACTION_DELETE);
                                    self.changeWorkingState(true);
                                    // Call web service to delete post.
                                    self.deleteComment(self.postToDelete.id).then(function(response) {
                                        if (!response.success) {
                                            self.showError(response.message);
                                            return true;
                                        }
                                        var data = response.data;
                                        // Delete success, begin to call template and render the page again.
                                        var commentSelector = $(t.SELECTOR.COMMENT_ID + data.id);

                                        // If expanded root with replies. Reload now because we deleted all replies.
                                        if (self.postToDelete.root) {
                                            var hasReplies = !self.checkEmptyElement(
                                                $(commentSelector).find(t.SELECTOR.COMMENT_REPLIES_CONTAINER_TO_ITEM)
                                            );
                                            if (self.postToDelete.expanded && hasReplies) {
                                                location.reload();
                                                return true;
                                            }
                                        }

                                        // Update global comment count, current count and total count should lose 1.
                                        self.updateCommentCount(self.lastCurrentCount - 1, self.lastTotal - 1);


                                        if (!data.hasOwnProperty('replies')) {
                                            data.replies = [];
                                        }

                                        var convertedCommentData = self.convertForTemplate(data, self.expand);

                                        // Reply will always be expanded.
                                        if (!convertedCommentData.root) {
                                            convertedCommentData.expanded = true;
                                        }

                                        // Call template to render.
                                        Templates.render(t.TEMPLATE_COMMENT, convertedCommentData).done(function(html) {
                                            var el = $(html);

                                            // Update the parent comment count if we delete reply before replace.
                                            if (!convertedCommentData.root) {
                                                var parentSelector = commentSelector.parent();
                                                var parentCountSelector = parentSelector.closest(t.SELECTOR.COMMENT_ITEM)
                                                    .find(t.TOTAL_REPLY);
                                                var countSelector = parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_NUMBER);
                                                var newCount = parseInt(countSelector.text()) - 1;
                                                parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_NUMBER).text(newCount);
                                                parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_TEXT).html(
                                                    newCount === 1 ? self.string.reply : self.string.replies
                                                );
                                            }

                                            // Clone replies and append because the replies will be replaced by template.
                                            var oldReplies = commentSelector.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER)
                                                .clone(true);
                                            commentSelector.replaceWith(el);
                                            el.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).replaceWith(oldReplies);

                                            if (self.postToDelete.root) {
                                                self.bindCommentEvent(data);
                                            } else {
                                                self.bindReplyEvent(data, el.parent());
                                            }
                                            self.changeWorkingState(false);

                                            M.util.js_complete(t.ACTION_DELETE);
                                        });
                                        modal.hide();
                                        return true;
                                    }).fail(function(err) {
                                        self.showError(err.message);
                                    });
                                });

                                // Focus back to delete button when user hide modal.
                                modal.getRoot().on(ModalEvents.hidden, function() {
                                    var el = $(t.SELECTOR.COMMENT_ID + self.postToDelete.id);
                                    // Focus on different element base on comment or reply.
                                    if (self.postToDelete.root) {
                                        el.find(t.SELECTOR.BTN_DELETE).first().focus();
                                    } else {
                                        el.find(t.SELECTOR.BTN_DELETE_REPLY).first().focus();
                                    }
                                });

                                // Enable button when modal is shown.
                                modal.getRoot().on(ModalEvents.shown, function() {
                                    self.changeWorkingState(false);
                                });

                                // Display the dialogue.
                                modal.show();

                                self.changeWorkingState(false);
                            });
                        }
                    },


                    /**
                     * Delete comment API.
                     *
                     * @param {Integer} id
                     * @returns {Promise}
                     */
                    deleteComment: function(id) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            commentid: id
                        });
                        var promise = ajax.call([{
                            methodname: t.ACTION_DELETE,
                            args: params
                        }]);
                        return promise[0];
                    },

                    /**
                     * Init Editor.
                     *
                     * @param {jQuery} el
                     */
                    initAttoEditor: function(el) {
                        var self = this;

                        // Set attribute to tag to use the placeholder.
                        var editorContentWrap = el.find(t.SELECTOR.ATTO.CONTENT_WRAP);
                        var editorContent = el.find(t.SELECTOR.ATTO.CONTENT);
                        var textarea = el.find('textarea');

                        // Wait for Atto editor to load draft content.
                        M.util.js_pending('init_editor');
                        // Add/check for content to add placeholder.
                        self.addRemovePlaceHolder(editorContent, editorContentWrap, textarea);
                        el.find(t.SELECTOR.ATTO.TOOLBAR).fadeIn();
                        M.util.js_complete('init_editor');
                    },

                    /**
                     * Add or remove placeholder to the Atto editor based on text content.
                     *
                     * @param {jQuery} editorContent
                     * @param {jQuery} editorContentWrap
                     * @param {jQuery} textarea
                     */
                    addRemovePlaceHolder: function(editorContent, editorContentWrap, textarea) {
                        var self = this;
                        if (!self.canAddPlaceHolder) {
                            return;
                        }
                        if (t.EMPTY_CONTENT.indexOf(editorContent.html()) > -1) {
                            var placeholder = self.textareaPlaceholder;
                            // Add this attribute to allow CSS to pick up and display as placeholder, use
                            // wrap instead of content directly to prevent cursor position bug on Firefox.
                            editorContentWrap.attr('data-placeholder', placeholder)
                                .addClass('force-redraw')
                                .removeClass('force-redraw'); // Force re-draw to prevent missing placeholder on safari.
                            textarea.attr('placeholder', placeholder);
                        } else {
                            editorContentWrap.attr('data-placeholder', '');
                            textarea.attr('placeholder', '');
                            // Once placeholder is removed never add again.
                            self.canAddPlaceHolder = false;
                            return;
                        }
                        // Check again, needed as Draft saved text can be added at any time in page load.
                        setTimeout(function() {
                            self.addRemovePlaceHolder(editorContent, editorContentWrap, textarea);
                        }, 250);
                    },

                    /**
                     * Bind event to disable button when text area content is empty.
                     *
                     * @param {jQuery} formSelector
                     */
                    bindEditorEvent: function(formSelector) {
                        var key = 'text_change_' + Date.now();
                        var submitBtn = formSelector.find(t.SELECTOR.SUBMIT_BUTTON);
                        submitBtn.addClass('disabled');
                        var textareaSelector = formSelector.find(t.SELECTOR.TEXTAREA);

                        var attoEditableId = textareaSelector.attr('id') + 'editable';
                        var attoEditable = document.getElementById(attoEditableId);
                        var observation = new MutationObserver(function(mutationsList) {
                            for (var i = 0; i < mutationsList.length; i++) {
                                var mutation = mutationsList[i];
                                if (mutation.type === 'childList') {
                                    M.util.js_pending(key);
                                    if (t.EMPTY_CONTENT.indexOf($('#' + attoEditableId).html()) > -1) {
                                        submitBtn.addClass('disabled');
                                        submitBtn.prop('disabled', true);
                                    } else {
                                        submitBtn.removeClass('disabled');
                                        submitBtn.prop('disabled', false);
                                    }
                                    M.util.js_complete(key);
                                }
                            }
                        });
                        observation.observe(attoEditable, {attributes: true, childList: true, subtree: true});

                        // Check interval for 5s incase draft content show up.
                        var interval = setInterval(function() {
                            formSelector.find('textarea[id^="id_message"]').trigger('change');
                        }, 350);

                        setTimeout(function() {
                            clearInterval(interval);
                        }, 5000);
                    },

                    /**
                     * Check if element is empty.
                     *
                     * @param {jQuery} el - Element.
                     * @returns {boolean}
                     */
                    checkEmptyElement: function(el) {
                        return el.length === 0;
                    }
                };
            },
            generate: function(params) {
                t.get().init(JSON.parse(params));
            }
        };
        return t;
    });

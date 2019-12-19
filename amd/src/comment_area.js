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
            ATTO_HEIGHT: 125,
            ROOT_COMMENT_VALUE: 0,
            TEMPLATE_COMMENTS: 'mod_studentquiz/comments',
            TEMPLATE_COMMENT: 'mod_studentquiz/comment',
            ACTION_CREATE: 'mod_studentquiz_create_comment',
            ACTION_CREATE_REPLY: 'mod_studentquiz_create_reply',
            ACTION_GET_ALL: 'mod_studentquiz_get_comments',
            ACTION_EXPAND: 'mod_studentquiz_expand_comment',
            ACTION_DELETE: 'mod_studentquiz_delete_comment',
            ACTION_LOAD_FRAGMENT_FORM: 'mod_studentquiz_load_fragment_form',
            ACTION_GET_LANG: 'mod_studentquiz_get_lang',
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
                COMMENT_FILTER_ITEM: '.studentquiz-comment-filter-item'
            },
            get: function() {
                return {
                    elementSelector: null,
                    btnExpandAll: null,
                    btnCollapseAll: null,
                    commentReply: null,
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
                    referer: null,
                    highlight: 0,
                    sortFeature: null,
                    sortable: [],

                    /*
                     * Init function.
                     * */
                    init: function(params) {
                        var self = this;
                        // Assign attribute.
                        self.elementSelector = $('#' + $.escapeSelector(params.id));
                        var el = self.elementSelector;

                        self.btnExpandAll = el.find(t.SELECTOR.EXPAND_ALL);
                        self.btnCollapseAll = el.find(t.SELECTOR.COLLAPSE_ALL);
                        self.commentReply = el.find(t.SELECTOR.SUBMIT_BUTTON);
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
                        self.referer = params.referer;
                        self.sortFeature = params.sortfeature;
                        self.sortable = params.sortable;
                        console.log(self.sortable);

                        // Get all language string.
                        M.util.js_pending(t.ACTION_GET_LANG);
                        str.get_strings([
                            {'key': 'required', component: 'core'},
                            {'key': 'deletecomment', component: 'mod_studentquiz'},
                            {'key': 'confirmdeletecomment', component: 'mod_studentquiz'},
                            {'key': 'delete', component: 'mod_studentquiz'},
                            {'key': 'cancel', component: 'core'},
                            {'key': 'reply', component: 'mod_studentquiz'},
                            {'key': 'replies', component: 'mod_studentquiz'},
                            {'key': 'editorplaceholder', component: 'mod_studentquiz'},
                            {'key': 'error', component: 'core'},
                        ]).done(function(s) {
                            self.string = {
                                required: s[0],
                                deletecomment: s[1],
                                confirmdelete: s[2],
                                delete: s[3],
                                cancel: s[4],
                                reply: s[5],
                                replies: s[6],
                                editor: {
                                    placeholder: s[7]
                                },
                                error: s[8]
                            };
                            M.util.js_complete(t.ACTION_GET_LANG);
                        });

                        this.initServerRender();
                        this.bindEvents();
                    },

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
                                expand: self.expand,
                                replies: replies,
                                root: true,
                                authorid: attrs.data('authorid')
                            };
                            self.bindCommentEvent(comment);
                        });
                        self.changeWorkingState(true);
                        self.initBindEditor();
                        self.updateCommentCount(self.countServerData.count.commentcount, self.countServerData.total);
                        if (self.countServerData.count.commentcount > 0) {
                            self.btnExpandAll.show();
                        }
                        self.changeWorkingState(false);

                        // Highlight.
                        var query = window.location.search.substring(1);
                        var getParams = self.parseQueryString(query);
                        self.highlight = parseInt(getParams.highlight) || 0;
                        // End get highlight

                        if (self.highlight !== 0) {
                            var highlight = $(t.SELECTOR.COMMENT_ID + self.highlight);
                            highlight.addClass('highlight');
                            self.scrollToElement(highlight);
                        }
                    },

                    /*
                     * This function will be called after the page is rendered to display.
                     * */
                    initCommentArea: function() {
                        var self = this;
                        self.changeWorkingState(true);
                        self.containerSelector.empty();
                        self.loadingIcon.show();
                        self.initBindEditor();
                        M.util.js_pending(t.ACTION_GET_ALL);
                        self.getComments(self.numberToShow, function(response) {
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
                            M.util.js_complete(t.ACTION_GET_ALL);
                            // Update global expand value.
                            self.expand = false;
                        });
                    },

                    initBindEditor: function() {
                        var self = this;
                        // Interval to init atto editor, there are time when Atto's Javascript slow to init the editor, so we
                        // check interval here to make sure the Atto is init before calling our script.
                        var interval = setInterval(function() {
                            if (self.formSelector.find(t.SELECTOR.ATTO.CONTENT).length !== 0) {
                                self.initAttoEditor(self.formSelector);
                                clearInterval(interval);
                            }
                        }, 500);
                        self.bindEditorEvent(self.formSelector);
                    },

                    /**
                     * Bind events: "Expand all comments", "Collapse all comments", "Add Reply".
                     */
                    bindEvents: function() {
                        var self = this;
                        // Bind event to "Expand all comments" button.
                        this.btnExpandAll.click(function() {
                            // Empty the replies section to append new response.
                            self.containerSelector.empty();
                            // Change button from expand to collapse collapse and disabled button since we don't want user to
                            // press the button when javascript is appending item or ajax is working.
                            self.btnExpandAll.hide();
                            self.btnCollapseAll.show();
                            self.loadingIcon.show();
                            self.changeWorkingState(true);
                            self.lastFocusElement = self.btnCollapseAll;
                            M.util.js_pending(t.ACTION_GET_ALL);
                            self.getComments(0, function(response) {
                                // Calculate length to display count.
                                var count = self.countCommentAndReplies(response.data);
                                var total = count.total;
                                self.updateCommentCount(total, response.total);
                                self.renderComment(response.data, true);
                                M.util.js_complete(t.ACTION_GET_ALL);
                                // Update global expand value.
                                self.expand = true;
                            });
                        });

                        // Bind event to "Collapse all comments" button.
                        this.btnCollapseAll.click(function() {
                            self.loadingIcon.show();
                            self.btnCollapseAll.hide();
                            self.containerSelector.empty();
                            self.btnExpandAll.show();
                            self.lastFocusElement = self.btnExpandAll;
                            self.initCommentArea();
                        });

                        // Bind event to "Add Reply" button.
                        this.commentReply.click(function() {
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
                            self.changeWorkingState(true);
                            self.loadingIcon.show();
                            var params = {
                                replyto: rootId,
                                message: {
                                    text: formData['message[text]'],
                                    format: formData['message[format]'],
                                },
                            };
                            self.createComment(params, function(response) {
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
                            });
                            return true;
                        });

                        $(t.SELECTOR.COMMENT_FILTER_ITEM).on('click', function(e) {
                            e.preventDefault();
                            var type = $(this).data('type');
                            var orderBy = $(this).attr('data-order') === 'desc' ? 'asc' : 'desc';

                            $(this).attr('data-order', orderBy);

                            $(t.SELECTOR.COMMENT_FILTER_ITEM).not(this).each(function(e){
                                var each = $(this);
                                each.attr('data-order', 'asc');
                                each.removeClass('filter-desc');
                                each.addClass('filter-asc');
                            });

                            if (orderBy === 'desc') {
                                $(this).removeClass('filter-asc');
                                $(this).addClass('filter-desc');
                            }
                            else {
                                $(this).removeClass('filter-desc');
                                $(this).addClass('filter-asc');
                            }
                            var sortType = type + '_' + orderBy;
                            self.setSort(sortType);

                            if (self.expand) {
                                self.btnExpandAll.trigger('click');
                            }
                            else self.btnCollapseAll.trigger('click');
                        });
                    },

                    /**
                     * Call the web service to get the comments, when nubmertoshow = 0, this function will get all comment with its replies.
                     *
                     * @param numberToShow
                     * @param callback
                     */
                    getComments: function(numberToShow, callback) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            numbertoshow: numberToShow,
                            sort: self.sortFeature
                        });
                        ajax.call([{
                            methodname: t.ACTION_GET_ALL,
                            args: params,
                            done: function(data) {
                                callback(data);
                            },
                            fail: function(data) {
                                self.showError(data.message);
                            }
                        }]);
                    },

                    /**
                     * Always map questionId and cmId to request before send.
                     * @param params
                     * @returns {*}
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
                     * @param message
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
                     * @param title
                     * @param body
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
                                type: ModalFactory.types.DEFAULT,
                                title: title,
                                body: body
                            }).done(function(modal) {
                                dialogue = modal;
                                // Display the dialogue.
                                dialogue.show();
                            });
                        }
                    },

                    /*
                    * Update the comments count on UI, of second parameter is not set then use the last value.
                    * */
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
                        if (noCommentSelector.length > 0 && current > 0) {
                            noCommentSelector.hide();
                        }

                        $.when(s).done(function(text) {
                            self.elementSelector.find(t.SELECTOR.COMMENT_COUNT).text(text);
                        });
                    },

                    /**
                     * Request template then append it into the page.
                     *
                     * @param comments
                     * @param expanded
                     * @returns {boolean}
                     */
                    renderComment: function(comments, expanded) {
                        var self = this;
                        comments = self.convertForTemplate(comments, expanded);
                        Templates.render(t.TEMPLATE_COMMENTS, {
                            comments: comments
                        }).done(function(html) {
                            self.containerSelector.append($(html));
                            // Loop to bind event.
                            for (var i = 0; i < comments.length; i++) {
                                self.bindCommentEvent(comments[i]);
                            }
                            self.changeWorkingState(false);
                            self.loadingIcon.hide();
                        });
                        return false;
                    },

                    /**
                     * Bind event to comment: report, reply, expand, collapse button.
                     *
                     * @param data
                     */
                    bindCommentEvent: function(data) {
                        var self = this;
                        // Loop comments and replies to get id and bind event for button inside it.
                        var el = self.containerSelector.find(t.SELECTOR.COMMENT_ID + data.id);
                        var i = 0;
                        if (data.root && data.hasOwnProperty('replies')) {
                            for (i; i < data.replies.length; i++) {
                                var reply = data.replies[i];
                                self.bindReplyEvent(reply, el);
                            }
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

                    /*
                    * Bind event to reply's report and edit button.
                    * */
                    bindReplyEvent: function(reply, el) {
                        var self = this;
                        var replySelector = el.find(t.SELECTOR.COMMENT_ID + reply.id);
                        replySelector.find(t.SELECTOR.BTN_DELETE_REPLY).click(function(e) {
                            self.bindDeleteEvent(reply);
                            e.preventDefault();
                        });
                    },

                    /*
                    * This function will disable/hide or enable/show when called depending on the working parameter.
                    * Should call this function when we are going to perform the heavy operation like calling web service,
                    * get render template, its will disabled button to prevent user from perform another action when page
                    * is loading.
                    * "working" is boolean parameter "true" will disable/hide "false" will enable/show.
                    * */
                    changeWorkingState: function(boolean) {
                        var visibility = boolean ? 'hidden' : 'visible';
                        var self = this;

                        if (self.lastCurrentCount === 0) {
                            visibility = 'hidden';
                        }
                        self.btnExpandAll.prop('disabled', boolean);
                        self.btnCollapseAll.prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_REPLY).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_DELETE).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.BTN_DELETE_REPLY).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.COMMENT_FILTER).prop('disabled', boolean);
                        self.elementSelector.find(t.SELECTOR.EXPAND_LINK).css('visibility', visibility);
                        self.elementSelector.find(t.SELECTOR.COLLAPSE_LINK).css('visibility', visibility);
                        if (self.deleteDialog) {
                            self.deleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', boolean);
                            self.deleteDialog.getFooter().find('button[data-action="yesandemail"]').prop('disabled', boolean);
                        }
                        if (boolean) {
                            self.commentReply.prop('disabled', boolean);
                        } else {
                            if (self.lastFocusElement) {
                                self.lastFocusElement.focus();
                                self.lastFocusElement = null;
                            }
                        }
                    },

                    /*
                     * Count comments, deleted comments and replies.
                     * */
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
                            if (item.deletedtime === 0) {
                                commentCount++;
                            } else {
                                deleteCommentCount++;
                            }
                            for (var j = 0; j < item.replies.length; j++) {
                                var reply = item.replies[j];
                                if (reply.deletedtime === 0) {
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

                    /*
                     * Call web service to info of comment and its replies.
                     * */
                    expandComment: function(id, callback) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            commentid: id
                        });
                        ajax.call([{
                            methodname: t.ACTION_EXPAND,
                            args: params,
                            done: function(data) {
                                callback(data);
                            },
                            fail: function(data) {
                                self.showError(data.message);
                            }
                        }]);
                    },

                    /*
                     * Expand event handler.
                     * */
                    bindExpandEvent: function(item) {
                        var self = this;
                        var itemSelector = self.elementSelector.find(t.SELECTOR.COMMENT_ID + item.id);
                        var key = t.ACTION_EXPAND;
                        // Clone loading icon selector then append into replies section.
                        var loadingIcon = self.loadingIcon.clone().show();
                        self.changeWorkingState(true);
                        itemSelector.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).append(loadingIcon);
                        $(self).hide();
                        M.util.js_pending(key);
                        // Call expand post web service to get replies.
                        self.expandComment(item.id, function(response) {
                            var convertedItem = self.convertForTemplate(response, true);

                            // If student can't see deleted comment in the reply, then remove them form array.
                            for (var i = 0; i < convertedItem.replies.length; i++) {
                                var reply = convertedItem.replies[i];
                                if (reply.deleted && !reply.canviewdeleted) {
                                    convertedItem.replies.splice(i, 1);
                                    i--;
                                }
                            }

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

                            Templates.render(t.TEMPLATE_COMMENT, convertedItem).done(function(html) {
                                var el = $(html);
                                itemSelector.replaceWith(el);
                                self.lastFocusElement = el.find(t.SELECTOR.COLLAPSE_LINK);
                                self.bindCommentEvent(response);
                                self.changeWorkingState(false);
                                M.util.js_complete(key);
                            });
                        });
                    },

                    /*
                     * Collapse event handler.
                     * */
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

                    convertForTemplate: function(data, expanded) {
                        var self = this;
                        var single = false;
                        if (data.constructor !== Array) {
                            data = [data];
                            single = true;
                        }
                        var i = 0;
                        for (i; i < data.length; i++) {
                            var item = data[i];
                            item.expanded = expanded;
                            if (self.referer) {
                                item.reportlink =  item.reportlink + '&referer=' + self.referer;
                            }
                            var j = 0;
                            for (j; j < item.replies.length; j++) {
                                var reply = item.replies[j];
                                if (self.referer) {
                                    reply.reportlink =  reply.reportlink + '&referer=' + self.referer;
                                }
                            }
                        }
                        return single ? data[0] : data;
                    },

                    /*
                    * Convert form data to Json require for web service.
                    * */
                    convertFormToJson: function(form) {
                        var data = {};
                        form.find(":input").each(function() {
                            var type = $(this).prop("type");
                            var name = $(this).attr('name');
                            // checked radios/checkboxes
                            if ((type === "checkbox" || type === "radio") && this.checked || (type !== "button" && type !== "submit")) {
                                data[name] = $(this).val();
                            }
                        });
                        return data;
                    },

                    /*
                    * Call web services to create comment.
                    * */
                    createComment: function(data, successcb) {
                        var self = this;
                        data = self.getParamsBeforeCallApi(data);
                        ajax.call([{
                            methodname: t.ACTION_CREATE,
                            args: data,
                            done: function(response) {
                                successcb(response);
                            },
                            fail: function(response) {
                                self.showError(response.message);
                                // Remove the fragment form container.
                                self.elementSelector.find(t.SELECTOR.COMMENT_ID + data.replyto + ' ' + t.SELECTOR.FRAGMENT_FORM).empty();
                            }
                        }]);
                    },

                    /*
                    * Append comment to the DOM, and call another function to bind the event into it.
                    * */
                    appendComment: function(item, target, isReply) {
                        var self = this;

                        item = self.convertForTemplate(item, true);
                        item.root = !isReply;

                        Templates.render(t.TEMPLATE_COMMENT, item).done(function(html) {
                            var el = $(html);
                            target.append(el);

                            if (!self.lastCurrentCount) {
                                // This is the first reply;
                                self.updateCommentCount(1, 1);
                                self.btnCollapseAll.prop('disabled', false);
                                self.btnCollapseAll.show();
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
                        });
                    },

                    /*
                    * Call web services to get the fragment form, append to the DOM then bind event.
                    * */
                    loadFragmentForm: function(fragmentForm, item) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            replyto: item.id,
                            cancelbutton: true
                        });
                        // Clear error message on the main form to prevent Atto editor from focusing to old message.
                        var attoWrap = self.formSelector.find(t.SELECTOR.ATTO_EDITOR_WRAP);
                        if (attoWrap.length !== 0 && attoWrap.hasClass('error')) {
                            attoWrap.removeClass('error');
                            attoWrap.find('#id_error_message_5btext_5d').remove();
                        }
                        var key = t.ACTION_LOAD_FRAGMENT_FORM;
                        M.util.js_pending(key);
                        fragment.loadFragment('mod_studentquiz', t.FRAGMENT_FORM_CALLBACK, self.contextId, params).done(function(html, js) {
                            Templates.replaceNodeContents(fragmentForm, html, js);
                            fragmentForm.find('#id_message' + item.id + 'editable').focus();
                            M.util.js_complete(key);
                            self.bindFragmentFormEvent(fragmentForm, item);
                        });
                    },

                    /*
                    * Bind fragment form action button event like "Reply" or "Save changes".
                    * */
                    bindFragmentFormEvent: function(fragmentForm, item) {
                        var self = this;
                        var formFragmentSelector = fragmentForm.find(t.SELECTOR.COMMENT_AREA_FORM);
                        fragmentForm.find(t.SELECTOR.SUBMIT_BUTTON).click(function() {
                            var data = self.convertFormToJson(formFragmentSelector);
                            // Check message field.
                            if (data['message[text]'].length === 0) {
                                return true; // Return true to trigger form validation and show error messages.
                            }
                            var clone = self.loadingIcon.clone().show();
                            clone.appendTo(fragmentForm);
                            formFragmentSelector.hide();
                            self.changeWorkingState(true);
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
                        self.createComment(params, function(response) {
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
                        });
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
                                body: self.string.confirmdelete,
                                footer: '<button type="button" data-action="yes" title="' +
                                    self.string.deletecomment + '">' + self.string.delete + '</button>' +
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
                                    self.deleteComment(self.postToDelete.id, function(response) {
                                        if (response.success) {
                                            var data = response.data;
                                            // Delete success, begin to call template and render the page again.
                                            var commentSelector = $(t.SELECTOR.COMMENT_ID + data.id);
                                            // Add empty array to prevent warning message on console.
                                            data.replies = [];
                                            var convertedCommentData = self.convertForTemplate(data, self.postToDelete.expanded);
                                            convertedCommentData.root = self.postToDelete.root;

                                            // Reply will always be expanded.
                                            if (!convertedCommentData.root) {
                                                convertedCommentData.expanded = true;
                                            }

                                            // Call template to render.
                                            Templates.render(t.TEMPLATE_COMMENT, convertedCommentData).done(function(html) {
                                                var el = $(html);

                                                // Update the parent comment count if we delete reply before replace.
                                                if (!convertedCommentData.root) {
                                                    var parentCountSelector = commentSelector.parent().closest(t.SELECTOR.COMMENT_ITEM)
                                                        .find(t.TOTAL_REPLY);
                                                    var countSelector = parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_NUMBER);
                                                    var newCount = parseInt(countSelector.text()) - 1;
                                                    parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_NUMBER).text(newCount);
                                                    parentCountSelector.find(t.SELECTOR.COMMENT_COUNT_TEXT).html(
                                                        newCount === 1 ? self.string.reply : self.string.replies
                                                    );
                                                }

                                                // Clone replies and append because the replies will be replaced by template.
                                                var oldReplies = commentSelector.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).clone(true);
                                                commentSelector.replaceWith(el);
                                                el.find(t.SELECTOR.COMMENT_REPLIES_CONTAINER).replaceWith(oldReplies);

                                                // Update global comment count, current count and total count should lose 1.
                                                self.updateCommentCount(self.lastCurrentCount - 1, self.lastTotal - 1);

                                                if (self.postToDelete.root) {
                                                    self.bindCommentEvent(data);
                                                } else {
                                                    self.bindReplyEvent(data, el.parent());
                                                }
                                                self.changeWorkingState(false);

                                                M.util.js_complete(t.ACTION_DELETE);
                                            });
                                        } else {
                                            // Unable to delete, show error message.
                                            self.showError(response.message);
                                        }
                                        modal.hide();
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


                    /*
                    * Delete comment API.
                    * */
                    deleteComment: function(id, callback) {
                        var self = this;
                        var params = self.getParamsBeforeCallApi({
                            commentid: id
                        });
                        ajax.call([{
                            methodname: t.ACTION_DELETE,
                            args: params,
                            done: function(data) {
                                callback(data);
                            },
                            fail: function(data) {
                                self.showError(data.message);
                            }
                        }]);
                    },

                    /*
                    * Init Atto editor action like expand when hover, add attribute to show placeholder text...
                    * */
                    initAttoEditor: function(el) {
                        var self = this;

                        var height = t.ATTO_HEIGHT;

                        // Set attribute to tag to use the placeholder.
                        var editorContentWrap = el.find(t.SELECTOR.ATTO.CONTENT_WRAP);
                        var editorContent = el.find(t.SELECTOR.ATTO.CONTENT);
                        var textarea = el.find('textarea');

                        // Wait for Atto editor to load draft content.
                        M.util.js_pending('init_editor');
                        // Add/check for content to add placeholder.
                        self.addRemovePlaceHolder(editorContent, editorContentWrap, textarea);

                        // Bind event to show Atto Editor when focus on editor content or textarea.
                        el.find(t.SELECTOR.ATTO.CONTENT + ', textarea').focus(function(e) {
                            e.preventDefault();
                            if (self.hasExpanded) {
                                return;
                            }
                            M.util.js_pending('expand_editor');

                            // Show editor toolbar.
                            el.find(t.SELECTOR.ATTO.TOOLBAR).fadeIn();

                            if (editorContent.is(":visible")) {
                                // Animation to expand editor content when current height is smaller
                                // than expected height and is visible.
                                if (editorContent.height() < height) {
                                    editorContent.animate({height: height}, 200);
                                    // Set height directly because the animation function will show the element.
                                    textarea.height(height);
                                }
                            }
                            if (textarea.is(":visible")) {
                                // Animation to expand textarea when current height is smaller
                                // than expected height and is visible.
                                if (textarea.height() < height) {
                                    textarea.animate({height: height}, 200);
                                    // Set height directly because the animation function will show the element.
                                    editorContent.height(height);
                                }
                            }

                            // Remove the placeholder when editor is expanded.
                            editorContentWrap.attr('data-placeholder', '');
                            textarea.attr('placeholder', '');
                            self.canAddPlaceHolder = false; // Stop addRemovePlaceHolder() adding it back.
                            self.hasExpanded = true;
                            M.util.js_complete('expand_editor');
                        });
                        M.util.js_complete('init_editor');
                    },
                    /**
                     * Add or remove placeholder to the Atto editor based on text content.
                     */
                    addRemovePlaceHolder: function(editorContent, editorContentWrap, textarea) {
                        var self = this;
                        if (!self.canAddPlaceHolder) {
                            return;
                        }
                        if (t.EMPTY_CONTENT.indexOf(editorContent.html()) > -1) {
                            var placeholder = self.string.editor.placeholder;
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

                    /*
                     * Bind event to disable button when text area content is empty.
                     * */
                    bindEditorEvent: function(formSelector) {
                        var key = 'text_change_' + Date.now();
                        var submitBtn = formSelector.find(t.SELECTOR.SUBMIT_BUTTON);
                        submitBtn.addClass('disabled');
                        var textareaSelector = formSelector.find(t.SELECTOR.TEXTAREA);
                        textareaSelector.on('change', function() {
                            M.util.js_pending(key);
                            if (t.EMPTY_CONTENT.indexOf($(this).val()) > -1) {
                                submitBtn.addClass('disabled');
                                submitBtn.prop('disabled', true);
                            } else {
                                submitBtn.removeClass('disabled');
                                submitBtn.prop('disabled', false);
                            }
                            M.util.js_complete(key);
                        });

                        // Check interval for 5s incase draft content show up.
                        var interval = setInterval(function() {
                            formSelector.find('textarea[id^="id_message"]').trigger('change');
                        }, 350);

                        setTimeout(function() {
                            clearInterval(interval);
                        }, 5000);
                    },

                    parseQueryString: function (query) {
                        var vars = query.split("&");
                        var queryString = {};
                        for (var i = 0; i < vars.length; i++) {
                            var pair = vars[i].split("=");
                            var key = decodeURIComponent(pair[0]);
                            var value = decodeURIComponent(pair[1]);
                            // If first entry with this name.
                            if (typeof queryString[key] === "undefined") {
                                queryString[key] = decodeURIComponent(value);
                                // If second entry with this name.
                            } else if (typeof queryString[key] === "string") {
                                queryString[key] = [queryString[key], decodeURIComponent(value)];
                                // If third or later entry with this name.
                            } else {
                                queryString[key].push(decodeURIComponent(value));
                            }
                        }
                        return queryString;
                    },

                    scrollToElement: function(target, speed) {
                        if (!target.length)
                        {
                            return;
                        }
                        if (typeof speed === 'undefined') {
                            speed = 1000;
                        }
                        var top = target.offset().top;
                        $('html,body').animate({scrollTop: top}, speed);
                    },

                    // Set sort depend on sortable array.
                    setSort: function(string) {
                        var self = this;
                        if( $.inArray(string, self.sortable) !== -1 ) {
                            self.sortFeature = string;
                        }
                    }
                };
            },
            generate: function(params) {
                var commentElement = t.get();
                commentElement.init(JSON.parse(params));
            }
        };
        return t;
    });

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
        return function() {
            return {
                elementselector: null,
                btnexpandall: null,
                btncollapseall: null,
                btnpostreply: null,
                subjectselector: null,
                introselector: null,
                postcontainerselector: null,
                courseid: null,
                questionid: null,
                idnumber: null,
                dialogue: null,
                loadingicon: null,
                lastfocuselement: null,
                formselector: null,
                contextId: null,
                userId: null,
                langstring: {},
                deleteDialog: null,
                undeleteDialog: null,
                posttodelete: null,
                posttoundelete: null,
                // Checked before placeholder is set.
                hasExpanded: false,
                // Checked before placeholder is set.
                canAddPlaceHolder: true,
                emptyContent: ['<br><p><br></p>', '<p><br></p>', '<br>', ''],
                // Store highlight post field for use in case it is removed then added back dynamically.
                formhighlightcontent: null,
                numberToShow: 5,

                TEMPLATE_COMMENTS: 'mod_studentquiz/comments',
                TEMPLATE_COMMENT: 'mod_studentquiz/comment',
                cmid: null,
                ACTION_CREATE: 'mod_studentquiz_create_comment',
                ACTION_GET_ALL: 'mod_studentquiz_get_comments',
                ACTION_EXPAND: 'mod_studentquiz_expand_comment',
                ACTION_DELETE: 'mod_studentquiz_delete_comment',
                ACTION_UNDELETE: 'mod_studentquiz_undelete_comment',
                ACTION_LOAD_FRAGMENT_FORM: 'mod_studentquiz_load_fragment_form',
                ROOT_COMMENT_VALUE: 0,

                /*
                 * Init function, this need to be called first to init the iPud element.
                 * */
                init: function(params) {
                    var self = this;
                    // Assign attribute.
                    self.elementselector = $('#' + $.escapeSelector(params.id));
                    self.btnexpandall = self.elementselector.find('.studentquiz-comment-expand');
                    self.btncollapseall = self.elementselector.find('.studentquiz-comment-collapse');
                    self.postreply = self.elementselector.find('#id_submitbutton');
                    self.subjectselector = self.elementselector.find('.studentquiz-comment-subject');
                    self.introselector = self.elementselector.find('.studentquiz-comment-introduction');
                    self.postcontainerselector = self.elementselector.find('.studentquiz-comment-replies');
                    self.postcountselector = self.elementselector.find('.studentquiz-comment-postcount');
                    self.loadingicon = self.elementselector.find('.studentquiz-comment-loading');
                    self.courseid = params.courseid;
                    self.questionid = parseInt(params.questionid);
                    self.idnumber = params.idnumber;
                    self.formselector = self.elementselector.find('.studentquiz-comment-postform > form');
                    self.contextId = parseInt(params.contextid);
                    self.userId = parseInt(params.userid);
                    self.numberToShow = parseInt(params.numbertoshow);
                    self.cmid = parseInt(params.cmid);

                    // Get all language string in one go.
                    str.get_strings([
                        {'key': 'required', component: 'core'},
                        {'key': 'deletecomment', component: 'mod_studentquiz'},
                        {'key': 'confirmdeletecomment', component: 'mod_studentquiz'},
                        {'key': 'delete', component: 'mod_studentquiz'},
                        {'key': 'cancel', component: 'core'},
                        {'key': 'undelete', component: 'mod_studentquiz'},
                        {'key': 'confirmundeletecomment', component: 'mod_studentquiz'},
                        {'key': 'reply', component: 'mod_studentquiz'},
                        {'key': 'replies', component: 'mod_studentquiz'},
                        {'key': 'editorplaceholder', component: 'mod_studentquiz'},
                        {'key': 'moderator', component: 'mod_studentquiz'},
                        {'key': 'important_ipud', component: 'mod_studentquiz'},
                        {'key': 'undeletecomment', component: 'mod_studentquiz'},
                    ]).done(function(s) {
                        self.langstring.required = s[0];
                        self.langstring.deletecomment = s[1];
                        self.langstring.confirmdelete = s[2];
                        self.langstring.delete = s[3];
                        self.langstring.cancel = s[4];
                        self.langstring.undelete = s[5];
                        self.langstring.confirmundelete = s[6];
                        self.langstring.reply = s[7];
                        self.langstring.replies = s[8];
                        self.langstring.editorplaceholder = s[9];
                        self.langstring.moderator = s[10];
                        self.langstring.highlighted = s[11];
                        self.langstring.undeletecomment = s[12];
                    });

                    this.initCommentArea();
                    this.bindEvents();
                },

                /*
                 * This function will be called after the page is rendered to display
                 * init discussion view.
                 * */
                initCommentArea: function() {
                    var self = this;

                    self.changeWorkingState(true);

                    self.postcontainerselector.empty();
                    self.btncollapseall.hide();
                    self.btnexpandall.hide();
                    self.btnexpandall.prop('disabled', true);
                    self.postcountselector.empty();
                    self.loadingicon.show();

                    var highlightel = self.formselector.find('#id_setimportant');
                    if (highlightel.length) {
                        // Different theme form layouts.
                        highlightel = highlightel.closest('#fitem_id_setimportant, .fitem');
                    }
                    if (!self.formhighlightcontent && highlightel.length) {
                        // Store highlight post field for use in case it is removed then added dynamically.
                        self.formhighlightcontent = highlightel.prop('outerHTML');
                    }

                    // Interval to init atto editor, there are time when Atto's Javascript slow to init the editor, so we
                    // check interval here to make sure the Atto is init before calling our script.
                    var interval = setInterval(function() {
                        if (self.formselector.find('.editor_atto_content').length !== 0) {
                            self.initAttoEditor(self.formselector);
                            clearInterval(interval);
                        }
                    }, 500);

                    this.bindEditorEvent(self.formselector);

                    M.util.js_pending(self.ACTION_GET_ALL);
                    self.getComments(self.questionid, self.numberToShow, function(response) {
                        // Calculate length to display the post count.
                        var count = self.countpostsandreplies(response.data);
                        var postcount = count.postcount;
                        var postdeleted = count.totaldelete;

                        // Only show expand button and post count if post existed.
                        if (postcount !== 0 || postdeleted !== 0) {
                            self.btnexpandall.show();
                            response.data.reverse();
                            self.updateCommentCount(postcount, response.total);
                            self.renderComment(response.data, false);
                        } else {
                            // No comment found hide loading icon.
                            self.loadingicon.hide();
                            self.changeWorkingState(false);
                            self.updateCommentCount(0, 0);
                        }
                        M.util.js_complete(self.ACTION_GET_ALL);
                    });
                },

                /*
                 * Bind the neccessary event to the button display when first time init the page like "Expand all post",
                 * "Collapse all post", "Post reply" group selector...
                 * */
                bindEvents: function() {
                    var self = this;
                    // Bind event to "Expand all posts" button.
                    this.btnexpandall.click(function() {
                        // Empty the replies section to append new response.
                        self.postcontainerselector.empty();

                        // Change button from expand to collapse collapse and disabled button since we don't want user to
                        // press the button when javascript is appending item or ajax is working.
                        self.btnexpandall.hide();
                        self.btncollapseall.show();
                        self.loadingicon.show();
                        self.changeWorkingState(true);
                        self.lastfocuselement = self.btncollapseall;
                        M.util.js_pending('question_get_comments');
                        self.getComments(self.questionid, 0, function(response) {
                            // Calculate length to display the post count.
                            var count = self.countpostsandreplies(response.data);
                            var total = count.total;

                            self.updateCommentCount(total, response.total);
                            self.renderComment(response.data, true);
                            M.util.js_complete('question_get_comments');
                        });
                    });

                    // Bind to prevent form perform normal submit.
                    this.formselector.submit(function(e) {
                        e.preventDefault();
                    });

                    // Bind event to "Collapse all posts" button.
                    this.btncollapseall.click(function() {
                        self.loadingicon.show();
                        // If group selector exist then use the groupid to reload.
                        self.btncollapseall.hide();
                        self.postcontainerselector.empty();
                        self.btnexpandall.show();
                        self.lastfocuselement = self.btnexpandall;
                        self.initCommentArea();
                    });

                    // Bind event to "Post reply" button.
                    this.postreply.click(function() {
                        var unique = self.questionid + '_' + self.ROOT_COMMENT_VALUE;
                        var formdata = self.convertFormToJson(self.formselector);
                        formdata.replyto = self.questionid;
                        // Check message field is required.
                        if (formdata['message[text]'].length === 0) {
                            // Show message, atto won't auto show after second form is appened.
                            var attowrap = self.formselector.find('.editor_atto_wrap');
                            if (attowrap.length !== 0 && !attowrap.hasClass('error')) {
                                attowrap.addClass('error');
                                attowrap.prepend('<span id="id_error_message_5btext_5d" class="error" tabindex="0">' +
                                    self.langstring.required + '</span>');
                            }
                            return false;
                        }
                        self.changeWorkingState(true);
                        self.loadingicon.show();
                        self.createComment({
                            replyto: self.ROOT_COMMENT_VALUE,
                            message: {
                                text: formdata['message[text]'],
                                format: formdata['message[format]'],
                            },
                        }, function(response) {
                            // Clear form in setTimeout to prevent require message still shown when reset on Firefox.
                            setTimeout(function() {
                                // Clear form data.
                                self.formselector.trigger('reset');
                                // Clear atto editor data.
                                self.formselector.find('#id_editor_question_' + unique + 'editable').empty();
                            });
                            // Add empty array to prevent warning message.
                            response.replies = [];
                            // Disable post reply button since content is now empty.
                            self.formselector.find('#id_submitbutton').addClass('disabled');
                            if (response.important) {
                                // Hide the important field as just made an important post.
                                var highlightel = self.formselector.find('#id_setimportant');
                                if (highlightel.length) {
                                    // Different theme form layouts.
                                    highlightel = highlightel.closest('#fitem_id_setimportant, .fitem');
                                    if (highlightel.length) {
                                        highlightel.remove();
                                    }
                                }
                            }
                            self.appendpost(response, self.elementselector.find('.studentquiz-comment-replies'));
                        });
                        return true;
                    });
                },

                /*
                 * Call the web service to get the posts, when nubmertoshow = 0, this function will get all post along
                 * with its replies, if failed will display the error dialog, if passed will call the third parameter.
                 * */
                getComments: function(questionId, numberToShow, callback) {
                    var self = this;
                    ajax.call([{
                        methodname: self.ACTION_GET_ALL,
                        args: {questionid: questionId, cmid: self.cmid, numbertoshow: numberToShow},
                        done: function(data) {
                            callback(data);
                        },
                        fail: function(data) {
                            self.showError(data.message);
                        }
                    }]);
                },

                /*
                * Show the error dialog, this function will call to showDialog() but with title is error local string
                * get from server.
                * */
                showError: function(message) {
                    var self = this;
                    // Get error string for title.
                    var errorsString = str.get_string('error', 'core');
                    $.when(errorsString).done(function(localString) {
                        self.showDialog(localString, message);
                        self.changeWorkingState(false);
                    });
                },

                /*
                * Show the dialog with custom title and body.
                * */
                showDialog: function(title, body) {
                    var self = this;
                    if (self.dialogue) {
                        // This dialog is existed, only change title and body and then display.
                        self.dialogue.title.html(title);
                        self.dialogue.body.html(body);
                        self.dialogue.show();
                    } else {
                        // This is the first time show the dialog, get the dialog then save it for later.
                        ModalFactory.create({
                            type: ModalFactory.types.DEFAULT,
                            title: title,
                            body: body
                        }).done(function(modal) {
                            self.dialogue = modal;

                            // Display the dialogue.
                            self.dialogue.show();
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
                        total = self.lasttotal;
                    } else {
                        self.lasttotal = total;
                    }

                    // If current parameter is not set, use the old value.
                    if (current === -1) {
                        current = self.lastcurrentcount;
                    } else {
                        self.lastcurrentcount = current;
                    }

                    // Get the postof local string and display.
                    var s = str.get_string('postof', 'filter_ipud', {
                        current: current,
                        total: total
                    });
                    $.when(s).done(function(localizedstring) {
                        self.postcountselector.text(localizedstring);
                    });
                },

                /*
                * Request template then append it into the page.
                * */
                renderComment: function(comments, expanded) {
                    var self = this;

                    comments = self.convertForTemplate(comments, expanded);

                    Templates.render(self.TEMPLATE_COMMENTS, {
                        comments: comments
                    }).done(function(html) {
                        var el = $(html);
                        self.postcontainerselector.append(el);
                        // Loop to bind event.
                        var i = 0;
                        for (i; i < comments.length; i++) {
                            var comment = comments[i];
                            self.bindCommentEvent(comment, el);
                        }
                        self.changeWorkingState(false);
                        self.loadingicon.hide();
                    });

                    return false;
                },

                /*
                * Bind event to comment's report, reply, edit and expand button.
                * */
                bindCommentEvent: function(data, element) {
                    var self = this;
                    // Loop comments and replies to get id and bind event for button inside it.
                    var el = element.find('#post' + data.id);
                    var i = 0;
                    for (i; i < data.replies.length; i++) {
                        var reply = data.replies[i];
                        self.bindReplyEvent(reply, el);
                    }
                    el.find('.studentquiz-comment-btndelete').click(function(e) {
                        self.bindpostdeleteevent(data);
                        e.preventDefault();
                    });
                    el.find('.studentquiz-comment-btnundelete').click(function(e) {
                        self.bindpostundeleteevent(data);
                        e.preventDefault();
                    });
                    el.find('.studentquiz-comment-btnreport').click(function() {
                        // TODO: Implement report button for post.
                    });
                    el.find('.studentquiz-comment-btnreply').click(function(e) {
                        e.preventDefault();
                        self.getFragmentFormReplyEvent(data);
                    });
                    el.find('.studentquiz-comment-expandlink').click(function(e) {
                        e.preventDefault();
                        self.bindExpandEvent(data);
                    });
                    el.find('.studentquiz-comment-collapselink').click(function(e) {
                        e.preventDefault();
                        self.bindCollapseEvent(data);
                    });
                },

                /*
                * Bind event to reply's report and edit button.
                * */
                bindReplyEvent: function(reply, postselector) {
                    var self = this;
                    var replyselector = postselector.find('#post' + reply.id);
                    replyselector.find('.studentquiz-comment-btnreportreply').click(function() {
                        // TODO: Implement report button for reply.
                    });
                    replyselector.find('.studentquiz-comment-btndeletereply').click(function(e) {
                        self.bindpostdeleteevent(reply);
                        e.preventDefault();
                    });
                    replyselector.find('.studentquiz-comment-btnundeletereply').click(function(e) {
                        self.bindpostundeleteevent(reply);
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
                changeWorkingState: function(working) {
                    var self = this;

                    if (working) {
                        // Disable/Hide action element in this iPud element.
                        self.btnexpandall.prop('disabled', true);
                        self.btncollapseall.prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnreport').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnreply').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnedit').addClass('disabled');
                        self.elementselector.find('.studentquiz-comment-btnedit').attr('tabindex', -1);
                        self.elementselector.find('.studentquiz-comment-btndelete').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btndeletereply').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnundelete').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnundeletereply').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btnreport').prop('disabled', true);
                        self.elementselector.find('.studentquiz-comment-btneditreply').addClass('disabled');
                        self.elementselector.find('.studentquiz-comment-btneditreply').attr('tabindex', -1);
                        self.elementselector.find('.studentquiz-comment-expandlink').css('visibility', 'hidden');
                        self.elementselector.find('.studentquiz-comment-collapselink').css('visibility', 'hidden');
                        // Disabled delete/undelete button in the dialog when making call to server to prevent
                        // user clicking too fast, which made Ajax request send multiple time.
                        if (self.deleteDialog) {
                            self.deleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', true);
                            self.deleteDialog.getFooter().find('button[data-action="yesandemail"]').prop('disabled', true);
                        }
                        if (self.undeleteDialog) {
                            self.undeleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', true);
                        }

                        self.postreply.prop('disabled', true);
                    } else {
                        // Enable/Show action element in this iPud element.
                        self.btnexpandall.prop('disabled', false);
                        self.btncollapseall.prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnreport').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnreply').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnedit').removeClass('disabled');
                        self.elementselector.find('.studentquiz-comment-btnedit').removeAttr('tabindex');
                        self.elementselector.find('.studentquiz-comment-btndelete').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btndeletereply').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnundelete').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnundeletereply').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btnreport').prop('disabled', false);
                        self.elementselector.find('.studentquiz-comment-btneditreply').removeClass('disabled');
                        self.elementselector.find('.studentquiz-comment-btneditreply').removeAttr('tabindex');
                        self.elementselector.find('.studentquiz-comment-expandlink').css('visibility', 'visible');
                        self.elementselector.find('.studentquiz-comment-collapselink').css('visibility', 'visible');
                        self.postreply.prop('disabled', false);

                        if (self.deleteDialog) {
                            self.deleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', false);
                            self.deleteDialog.getFooter().find('button[data-action="yesandemail"]').prop('disabled', false);
                        }
                        if (self.undeleteDialog) {
                            self.undeleteDialog.getFooter().find('button[data-action="yes"]').prop('disabled', false);
                        }

                        if (self.lastfocuselement) {
                            self.lastfocuselement.focus();
                            self.lastfocuselement = null;
                        }
                    }
                },

                /*
                 * Count posts, deleted posts and replies.
                 * */
                countpostsandreplies: function(posts) {
                    var postcount = 0;
                    var deletepostcount = 0;
                    var replycount = 0;
                    var deletereplycount = 0;

                    if (posts.constructor !== Array) {
                        posts = [posts];
                    }

                    for (var i = 0; i < posts.length; i++) {
                        var post = posts[i];
                        if (post.deletedtime === 0) {
                            postcount++;
                        } else {
                            deletepostcount++;
                        }
                        for (var j = 0; j < post.replies.length; j++) {
                            var reply = post.replies[j];
                            if (reply.deletedtime === 0) {
                                replycount++;
                            } else {
                                deletereplycount++;
                            }
                        }
                    }
                    return {
                        total: postcount + replycount,
                        totaldelete: deletepostcount + deletereplycount,
                        postcount: postcount,
                        deletepostcount: deletepostcount,
                        replycount: replycount,
                        deletereplycount: deletereplycount
                    };
                },

                /*
                 * Call web service to info of comment and its replies.
                 * */
                expandComment: function(commentid, successcb) {
                    var self = this;

                    ajax.call([{
                        methodname: self.ACTION_EXPAND,
                        args: {
                            questionid: self.questionid,
                            cmid: self.cmid,
                            commentid: commentid
                        },
                        done: function(data) {
                            successcb(data);
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
                    var itemSelector = self.elementselector.find('#post' + item.id);
                    var key = self.ACTION_EXPAND;
                    // Clone loading icon selector then append into replies section.
                    var loadingicon = self.loadingicon.clone().show();
                    self.changeWorkingState(true);
                    itemSelector.find('.ipud_post-replies').append(loadingicon);
                    $(self).hide();
                    M.util.js_pending(key);
                    // Call expand post web service to get replies.
                    self.expandComment(item.id, function(response) {
                        var convertedItem = self.convertForTemplate(response, true);

                        // If student can't see deleted post in the reply, then remove them form array
                        // to make iPud view consistency with ForumNG view.
                        for (var i = 0; i < convertedItem.replies.length; i++) {
                            var reply = convertedItem.replies[i];
                            if (reply.deleted && !reply.canviewdeleted) {
                                convertedItem.replies.splice(i, 1);
                                i--;
                            }
                        }

                        // Count current reply displayed, because user can reply to this post then press expanded.
                        var currentdisplaypost = itemSelector.find('.ipud_post-replies .studentquiz-comment-post').length;

                        // Update discussion count, handle the case when another user add post then current user expand.
                        var total = self.countpostsandreplies(convertedItem).replycount;
                        var newcurrentcount = self.lastcurrentcount + total - currentdisplaypost;
                        var newtotalcount = self.lasttotal + (convertedItem.numberofreply - item.numberofreply);

                        // Update count for case when student view the collapsed undeleted post, then manager delete
                        // and student expand (also vice versa).
                        // Post deleted then un-deleted by someone else.
                        if (item.deleted && !convertedItem.deleted) {
                            newcurrentcount++;
                            newtotalcount++;
                        }

                        // Normal post, then deleted by someone else.
                        if (!item.deleted && convertedItem.deleted) {
                            newcurrentcount--;
                            newtotalcount--;
                        }

                        // If current show post == total mean that all post is shown.
                        if (newcurrentcount === newtotalcount) {
                            self.btnexpandall.hide();
                            self.btncollapseall.show();
                        }

                        self.updateCommentCount(newcurrentcount, newtotalcount);

                        Templates.render(self.TEMPLATE_COMMENT, convertedItem).done(function(html) {
                            var el = $(html);
                            // Replace the whole post in case this post have been edited by another
                            // user or in another browser.
                            itemSelector.replaceWith(el);
                            self.lastfocuselement = el.find('.studentquiz-comment-collapselink');
                            self.bindCommentEvent(response, el.parent());
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

                    var postselector = self.elementselector.find('#post' + item.id);

                    // Minus the post currently show, exclude the deleted post, update main count.
                    // Using DOM to count the reply exclude the deleted, when user delete the reply belong to this post,
                    // current post object don't know that, so we using DOM in this case.
                    var displaypostcount = postselector.find('.ipud_post-replies .studentquiz-comment-text').length;
                    self.updateCommentCount(self.lastcurrentcount - displaypostcount, -1);
                    // Assign back to post object in case user then collapse the post.
                    item.numberofreply = displaypostcount;

                    // Remove reply for this post.
                    postselector.find('.ipud_post-replies').empty();

                    // Replace post content with short content.
                    if (item.deleted) {
                        postselector.find('.studentquiz-comment-delete-content').html(item.shortcontent);
                    } else {
                        postselector.find('.studentquiz-comment-text ').html(item.shortcontent);
                    }

                    // Hide collapse and show expand icon.
                    postselector.find('.studentquiz-comment-collapselink').hide();
                    postselector.find('.studentquiz-comment-expandlink').show().focus();

                    // Update post state.
                    item.expanded = false;
                },

                convertForTemplate: function(data, expanded) {
                    var single = false;
                    if (data.constructor !== Array) {
                        data = [data];
                        single = true;
                    }

                    var i = 0;
                    for (i; i < data.length; i++) {
                        var item = data[i];

                        item.deleted = item.deletedtime !== 0;
                        item.plural = item.numberofreply === 0 || item.numberofreply > 1;
                        item.expanded = expanded;
                        item.showmod = item.ismoderator === 1 || item.ismoderator === 2;
                        item.postasanonmod = item.ismoderator === 2;
                        item.showauthor = !item.postasanonmod || (item.postasanonmod && item.canviewanon);
                        item.canviewanonpost = item.postasanonmod && item.canviewanon;
                        item.ispost = true;

                        var j = 0;
                        for (j; j < item.replies.length; j++) {
                            var reply = item.replies[j];
                            reply.deleted = reply.deletedtime !== 0;
                            reply.showmod = reply.ismoderator === 1 || reply.ismoderator === 2;
                            reply.postasanonmod = reply.ismoderator === 2;
                            reply.showauthor = !reply.postasanonmod || (reply.postasanonmod && reply.canviewanon);
                            reply.canviewanonpost = reply.postasanonmod && reply.canviewanon;
                            reply.ispost = false;
                        }
                    }

                    return single ? data[0] : data;
                },

                /*
                * Convert form data to Json require for web service.
                * */
                convertFormToJson: function(form) {
                    var array = form.serializeArray();
                    var json = {};

                    $.each(array, function() {
                        json[this.name] = this.value || '';
                    });

                    return json;
                },

                /*
                * Call web services to create comment.
                * */
                createComment: function(data, successcb) {
                    var self = this;
                    data.questionid = self.questionid;
                    data.cmid = self.cmid;
                    ajax.call([{
                        methodname: self.ACTION_CREATE,
                        args: data,
                        done: function(response) {
                            successcb(response);
                        },
                        fail: function(response) {
                            self.showError(response.message);
                            // Remove the fragment form container.
                            self.elementselector.find('#post' + data.replyto + ' .studentquiz-comment-postfragmentform').empty();
                        }
                    }]);
                },

                /*
                * Append post to the DOM, and call another function to bind the event into it.
                * */
                appendpost: function(post, targetselector, isreply) {
                    var self = this;

                    post = self.convertForTemplate(post, true);

                    if (isreply) {
                        post.ispost = false;
                    }

                    Templates.render(self.TEMPLATE_COMMENT, post).done(function(html) {
                        var el = $(html);
                        targetselector.append(el);

                        if (!self.lastcurrentcount) {
                            // This is the first reply of this discussion.
                            self.updateCommentCount(1, 1);
                            self.btncollapseall.prop('disabled', false);
                            self.btncollapseall.show();
                        } else {
                            self.updateCommentCount(self.lastcurrentcount + 1, self.lasttotal + 1);
                        }

                        if (isreply) {
                            self.bindReplyEvent(post, el.parent());
                            self.lastfocuselement = targetselector.find('.studentquiz-comment-btneditreply');
                        } else {
                            self.bindCommentEvent(post, el.parent());
                            self.lastfocuselement = targetselector.find('.studentquiz-comment-btnedit');
                        }

                        self.loadingicon.hide();
                        self.changeWorkingState(false);
                    });
                },

                /*
                * Call web services to get the fragment form, append to the DOM then bind event.
                * */
                loadFragmentForm: function(item, appendselector) {
                    var self = this;
                    var params = [];
                    params.replyto = item.id;
                    params.questionid = self.questionid;
                    params.cmid = self.cmid;
                    params.cancelbutton = true;

                    // Clear error message on the main form to prevent Atto editor from focusing to old message.
                    var attoWrap = self.formselector.find('.editor_atto_wrap');
                    if (attoWrap.length !== 0 && attoWrap.hasClass('error')) {
                        attoWrap.removeClass('error');
                        attoWrap.find('#id_error_message_5btext_5d').remove();
                    }
                    M.util.js_pending(self.ACTION_LOAD_FRAGMENT_FORM);
                    fragment.loadFragment('mod_studentquiz', 'commentform', self.contextId, params).done(function(html, js) {
                        Templates.replaceNodeContents(appendselector, html, js);
                        appendselector.find('#id_message' + item.id + 'editable').focus();
                        appendselector.find('form').submit(function(e) {
                            e.preventDefault();
                        });
                        var highlightel = appendselector.find('#id_setimportant');
                        if (highlightel.length) {
                            // Different layout in themes.
                            highlightel = highlightel.closest('#fitem_id_setimportant, .fitem');
                        }
                        if (!self.formhighlightcontent && highlightel.length) {
                            self.formhighlightcontent = highlightel.prop('outerHTML');
                        }
                        M.util.js_complete(self.ACTION_LOAD_FRAGMENT_FORM);
                        self.bindFragmentFormEvent(appendselector, item);
                    });
                },

                /*
                * Bind fragment form action button event like "Reply" or "Save changes".
                * */
                bindFragmentFormEvent: function(containerSelector, item) {
                    var self = this;

                    var fragmentsubmitbtn = containerSelector.find('#id_submitbutton');
                    var formselector = containerSelector.find('form');

                    fragmentsubmitbtn.click(function() {
                        var formdata = self.convertFormToJson(formselector);
                        // Check message field is required.
                        if (formdata['message[text]'].length === 0) {
                            return true; // Return true to trigger form validation and show error messages.
                        }
                        var clone = self.loadingicon.clone().show();
                        clone.appendTo(containerSelector);
                        formselector.hide();
                        self.changeWorkingState(true);
                        self.createReplyComment(containerSelector, item, formselector, formdata);
                        return true;
                    });
                    self.fragmentformcancelbutonevent(formselector);
                    self.bindEditorEvent(containerSelector);
                },

                /*
                * Call web services to create reply, update parent post count, remove the fragment form.
                * */
                createReplyComment: function(containerselector, post, formselector, formdata) {
                    var self = this;
                    M.util.js_pending('ipudcreatereply');
                    self.createComment({
                        replyto: post.id,
                        questionid: self.questionid,
                        cmid: self.cmid,
                        message: {
                            text: formdata['message[text]'],
                            format: formdata['message[format]'],
                        }
                    }, function(response) {
                        var postselector = self.elementselector.find('#post' + post.id);
                        var postrepliesselector = postselector.find('.ipud_post-replies');

                        // There are case when user delete the reply then add reply then the numberofreply property is
                        // not correct because this post object does not know the child object is deleted, so we update
                        // post count using DOM.
                        post.numberofreply++;

                        var numreply = parseInt(postselector.find('.studentquiz-comment-count-number').text()) + 1;

                        // Update total post count.
                        postselector.find('.studentquiz-comment-count-number').text(numreply);
                        postselector.find('.studentquiz-comment-count-text').html(
                            numreply === 1 ? self.langstring.reply : self.langstring.replies
                        );

                        containerselector.empty();
                        response.replies = [];
                        self.appendpost(response, postrepliesselector, true);
                        M.util.js_complete('ipudcreatereply');
                    });
                },

                /*
                * Call web service to update post.
                * */
                editpost: function(data, successcb) {
                    var self = this;

                    ajax.call([{
                        methodname: 'mod_forumng_edit_post',
                        args: data,
                        done: function(response) {
                            successcb(response);
                        },
                        fail: function(response) {
                            self.showError(response.message);
                            // Remove the fragment form container.
                            self.elementselector.find('#post' + data.id + ' .studentquiz-comment-postfragmentform').empty();
                        }
                    }]);
                },

                /*
                * Begin to load the fragment form for reply.
                * */
                getFragmentFormReplyEvent: function(item) {
                    var self = this;
                    var el = self.elementselector.find('#post' + item.id);
                    var fragmentForm = el.find('.studentquiz-comment-postfragmentform').first();
                    var clone = self.loadingicon.clone().show();
                    fragmentForm.append(clone);
                    self.loadFragmentForm(item, fragmentForm);
                    self.changeWorkingState(true);
                },

                /*
                * Bind fragment form cancel button event.
                * */
                fragmentformcancelbutonevent: function(formselector, isedit) {
                    var self = this;
                    var cancelbtnselector = formselector.find('#id_cancel');
                    cancelbtnselector.click(function(e) {
                        e.preventDefault();

                        var postselector = formselector.closest('.studentquiz-comment-post');
                        if (isedit) {
                            self.lastfocuselement = postselector.find('.studentquiz-comment-btnedit');
                            if (self.lastfocuselement.length === 0) {
                                self.lastfocuselement = postselector.find('.studentquiz-comment-btneditreply');
                            }
                        } else {
                            self.lastfocuselement = postselector.find('.studentquiz-comment-btnreply');
                        }

                        self.changeWorkingState(false);
                        formselector.parent().empty();
                    });
                },

                /*
                * Bind post delete event.
                * */
                bindpostdeleteevent: function(post) {
                    var self = this;
                    self.posttodelete = post;

                    if (self.deleteDialog) {
                        // Hide button Delete and email if self delete a post.
                        if (self.posttodelete.authorid === self.userId) {
                            self.deleteDialog.getFooter().find('button[data-action="yesandemail"]').hide();
                        } else {
                            self.deleteDialog.getFooter().find('button[data-action="yesandemail"]').show();
                        }
                        // Use the rendered modal.
                        self.deleteDialog.show();
                    } else {
                        // Disabled button to prevent user from double click on button while loading for template
                        // for the first time.
                        self.changeWorkingState(true);
                        ModalFactory.create({
                            type: ModalFactory.types.DEFAULT,
                            title: self.langstring.deletecomment,
                            body: self.langstring.confirmdelete,
                            footer: '<button type="button" data-action="yes" title="' +
                                self.langstring.deletecomment + '">' + self.langstring.delete + '</button>' +
                                '<button type="button" data-action="no" title="' + self.langstring.cancel + '">' +
                                self.langstring.cancel + '</button>'
                        }).done(function(modal) {
                            // Save modal for later.
                            self.deleteDialog = modal;

                            // Hide button Delete and email if self delete a post.
                            if (self.posttodelete.authorid === self.userId) {
                                modal.getFooter().find('button[data-action="yesandemail"]').hide();
                            } else {
                                modal.getFooter().find('button[data-action="yesandemail"]').show();
                            }

                            // Bind event for cancel button.
                            modal.getFooter().find('button[data-action="no"]').click(function(e) {
                                e.preventDefault();
                                modal.hide();
                            });

                            // Bind event for delete button.
                            modal.getFooter().find('button[data-action="yes"]').click(function(e) {
                                e.preventDefault();
                                M.util.js_pending('ipuddeletepost');
                                self.changeWorkingState(true);
                                // Call web service to delete post.
                                self.deleteComment(self.posttodelete.id, function(response) {
                                    if (response.success) {
                                        // Delete success, begin to call template and render the page again.
                                        var postselector = $('#post' + response.postinfo.id);

                                        // Add empty array to prevent warning message on console.
                                        response.postinfo.replies = [];
                                        var convertedpost = self.convertForTemplate(response.postinfo,
                                            self.posttodelete.expanded);
                                        convertedpost.ispost = self.posttodelete.ispost;

                                        // Reply will always be expanded.
                                        if (!convertedpost.ispost) {
                                            convertedpost.expanded = true;
                                        }

                                        // Call template to render.
                                        Templates.render(self.TEMPLATE_COMMENT, convertedpost).done(function(html) {
                                            var el = $(html);

                                            // Update the parent post count if we delete reply before replace.
                                            if (!convertedpost.ispost) {
                                                var parentcountselector = postselector.parent().closest('.studentquiz-comment-post')
                                                    .find('.studentquiz-comment-totalreply');
                                                var countSelector = parentcountselector.find('.studentquiz-comment-count-number');
                                                var newcount = parseInt(countSelector.text()) - 1;
                                                parentcountselector.find('.studentquiz-comment-count-number').text(newcount);
                                                parentcountselector.find('.studentquiz-comment-count-text').html(
                                                    newcount === 1 ? self.langstring.reply : self.langstring.replies
                                                );
                                            }

                                            // Clone replies and append because the replies will be replaced by template.
                                            var oldreplies = postselector.find('.ipud_post-replies').clone(true);
                                            postselector.replaceWith(el);
                                            el.find('.ipud_post-replies').replaceWith(oldreplies);

                                            // Focus on undelete button if exist, otherwise focus on deleted post avatar.
                                            var btnundelete = el.find('.studentquiz-comment-btnundelete');
                                            if (btnundelete.length === 0) {
                                                btnundelete = el.find('.studentquiz-comment-btnundeletereply');
                                            }
                                            if (btnundelete.length === 0) {
                                                self.lastfocuselement = el.find('.studentquiz-comment-pic > a').first();
                                            } else {
                                                self.lastfocuselement = btnundelete;
                                            }

                                            // Update global post count, current count and total count should lose 1.
                                            self.updateCommentCount(self.lastcurrentcount - 1, self.lasttotal - 1);

                                            // Bind event to newly append post or reply.
                                            if (self.posttodelete.ispost) {
                                                self.bindCommentEvent(response.postinfo, el.parent());
                                            } else {
                                                self.bindReplyEvent(response.postinfo, el.parent());
                                            }

                                            // Call this to trigger focus to element.
                                            self.changeWorkingState(false);

                                            M.util.js_complete('ipuddeletepost');
                                        });
                                    } else {
                                        // Unable to delete, show error message
                                        self.showError(response.message);
                                    }
                                    modal.hide();
                                });
                            });

                            // Focus back to delete button when user hide modal.
                            modal.getRoot().on(ModalEvents.hidden, function() {
                                var postselector = $('#post' + self.posttodelete.id);
                                // Focus on different element base on post or reply.
                                if (self.posttodelete.ispost) {
                                    postselector.find('.studentquiz-comment-btndelete').first().focus();
                                } else {
                                    postselector.find('.studentquiz-comment-btndeletereply').first().focus();
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
                * Bind post undelete event.
                * */
                bindpostundeleteevent: function(post) {
                    var self = this;

                    self.posttoundelete = post;

                    if (self.undeleteDialog) {
                        self.undeleteDialog.show();
                    } else {
                        // Disabled button to prevent user from double click on button while loading for template
                        // for the first time.
                        self.changeWorkingState(true);

                        ModalFactory.create({
                            type: ModalFactory.types.DEFAULT,
                            title: self.langstring.undeletecomment,
                            body: self.langstring.confirmundelete,
                            footer: '<button type="button" data-action="yes" title="' +
                                self.langstring.undeletecomment + '">' + self.langstring.undelete + '</button>' +
                                '<button type="button" data-action="no" title="' + self.langstring.cancel + '">' +
                                self.langstring.cancel + '</button>'
                        }).done(function(modal) {
                            self.undeleteDialog = modal;

                            // Bind event for cancel button.
                            modal.getFooter().find('button[data-action="no"]').click(function(e) {
                                e.preventDefault();
                                modal.hide();
                            });

                            // Bind event for undelete button.
                            modal.getFooter().find('button[data-action="yes"]').click(function(e) {
                                e.preventDefault();
                                M.util.js_pending(self.ACTION_UNDELETE);
                                self.changeWorkingState(true);
                                // Call web service for undelete comment.
                                self.undeleteComment(self.posttoundelete.id, function(response) {
                                    if (response.success) {
                                        // Undelete post success, begin call template to render post.
                                        var itemSelector = $('#post' + response.postinfo.id);

                                        // Add empty array to prevent warning message on console.
                                        response.postinfo.replies = [];
                                        var convertedpost = self.convertForTemplate(response.postinfo,
                                            self.posttoundelete.expanded);
                                        convertedpost.ispost = self.posttoundelete.ispost;

                                        // Reply will always be expanded.
                                        if (!convertedpost.ispost) {
                                            convertedpost.expanded = true;
                                        }

                                        // Call template to render post again.
                                        Templates.render(self.TEMPLATE_COMMENT, convertedpost).done(function(html) {
                                            var el = $(html);
                                            // Update the parent post count if we undelete reply before replace.
                                            if (!convertedpost.ispost) {
                                                var parentCountEl = itemSelector.parent().closest('.studentquiz-comment-post')
                                                    .find('.studentquiz-comment-totalreply');
                                                var count = parseInt(parentCountEl.find('.studentquiz-comment-count-number').text());
                                                var newCount = count + 1;
                                                parentCountEl.find('.studentquiz-comment-count-number').text(newCount);
                                                parentCountEl.find('.studentquiz-comment-count-text').html(
                                                    newCount === 1 ? self.langstring.reply : self.langstring.replies
                                                );
                                            }

                                            // Clone and backup rendered reply because it will be replaced by template.
                                            var oldReplies = itemSelector.find('.ipud_post-replies').clone(true);
                                            itemSelector.replaceWith(el);
                                            el.find('.ipud_post-replies').replaceWith(oldReplies);

                                            // Focus on delete button.
                                            var btndelete = el.find('.studentquiz-comment-btndelete');
                                            if (btndelete.length === 0) {
                                                btndelete = el.find('.studentquiz-comment-btndeletereply');
                                            }
                                            self.lastfocuselement = btndelete;

                                            // Update global comment count current count and total count should have 1 more.
                                            self.updateCommentCount(self.lastcurrentcount + 1, self.lasttotal + 1);

                                            // Bind event to newly append comment or reply.
                                            if (self.posttoundelete.ispost) {
                                                self.bindCommentEvent(response.postinfo, el.parent());
                                            } else {
                                                self.bindReplyEvent(response.postinfo, el.parent());
                                            }

                                            // Call this to trigger focus to element.
                                            self.changeWorkingState(false);

                                            M.util.js_complete(self.ACTION_UNDELETE);
                                        });
                                    } else {
                                        // Unable to undelete comment, show error dialog.
                                        self.showError(response.message);
                                    }
                                    modal.hide();
                                });
                            });

                            // Focus back to delete button when user hide modal.
                            modal.getRoot().on(ModalEvents.hidden, function() {
                                var postselector = $('#post' + self.posttoundelete.id);
                                // Focus on undelete button of current post when user hide the dialog.
                                if (self.posttoundelete.ispost) {
                                    postselector.find('.studentquiz-comment-btnundelete').first().focus();
                                } else {
                                    postselector.find('.studentquiz-comment-btnundeletereply').first().focus();
                                }
                            });

                            // Enable button when modal is shown.
                            modal.getRoot().on(ModalEvents.shown, function() {
                                self.changeWorkingState(false);
                            });

                            // Display the dialogue.
                            modal.show();
                        });
                    }
                },

                /*
                * Call web service to delete comment.
                * */
                deleteComment: function(id, successcb) {
                    var self = this;

                    ajax.call([{
                        methodname: self.ACTION_DELETE,
                        args: {
                            questionid: self.questionid,
                            cmid: self.cmid,
                            commentid: id
                        },
                        done: function(data) {
                            successcb(data);
                        },
                        fail: function(data) {
                            self.showError(data.message);
                        }
                    }]);
                },

                /*
                * Call web service to undelete comment.
                * */
                undeleteComment: function(id, successcb) {
                    var self = this;

                    ajax.call([{
                        methodname: self.ACTION_UNDELETE,
                        args: {
                            questionid: self.questionid,
                            cmid: self.cmid,
                            commentid: id
                        },
                        done: function(data) {
                            successcb(data);
                        },
                        fail: function(data) {
                            self.showError(data.message);
                        }
                    }]);
                },

                /*
                * Init Atto editor action like expand when hover, add attribute to show placeholder text...
                * */
                initAttoEditor: function(selector) {
                    var self = this;

                    // Set attribute to tag to use the placeholder.
                    var expandheight = 125;
                    var editorcontentwrap = selector.find('.editor_atto_content_wrap');
                    var editorcontent = selector.find('.editor_atto_content');
                    var textarea = selector.find('textarea');
                    var attotoolbar = selector.find('.editor_atto_toolbar');

                    // Wait for Atto editor to load draft content.
                    M.util.js_pending('initeditor');
                    // Add/check for content to add placeholder.
                    self.addRemovePlaceHolder(editorcontent, editorcontentwrap, textarea);

                    // Bind event to show Atto Editor when focus on editor content or textarea.
                    selector.find('.editor_atto_content, textarea').focus(function(e) {
                        if (self.hasExpanded) {
                            // Have already opened - so do nothing now.
                            return;
                        }
                        M.util.js_pending('expandeditor');
                        e.preventDefault();

                        // Show editor toolbar.
                        attotoolbar.fadeIn();

                        if (editorcontent.is(":visible")) {
                            // Animation to expand editor content when current height is smaller
                            // than expected height and is visible.
                            if (editorcontent.height() < expandheight) {
                                editorcontent.animate({height: expandheight}, 200);
                                // Set height directly because the animation function will show the element.
                                textarea.height(expandheight);
                            }
                        }
                        if (textarea.is(":visible")) {
                            // Animation to expand textarea when current height is smaller
                            // than expected height and is visible.
                            if (textarea.height() < expandheight) {
                                textarea.animate({height: expandheight}, 200);
                                // Set height directly because the animation function will show the element.
                                editorcontent.height(expandheight);
                            }
                        }

                        // Remove the placeholder when editor is expanded.
                        editorcontentwrap.attr('data-placeholder', '');
                        textarea.attr('placeholder', '');
                        self.canAddPlaceHolder = false; // Stop addRemovePlaceHolder() adding it back.
                        self.hasExpanded = true;
                        M.util.js_complete('expandeditor');
                    });
                    M.util.js_complete('initeditor');
                },
                /**
                 * Add or remove placeholder to the Atto editor based on text content
                 */
                addRemovePlaceHolder: function(editorcontent, editorcontentwrap, textarea) {
                    var self = this;

                    if (!self.canAddPlaceHolder) {
                        return;
                    }

                    if (self.emptyContent.indexOf(editorcontent.html()) > -1) {
                        // Add this attribute to allow CSS to pick up and display as placeholder, use
                        // wrap instead of content directly to prevent cursor position bug on Firefox.
                        editorcontentwrap.attr('data-placeholder', self.langstring.editorplaceholder)
                            .addClass('force-redraw')
                            .removeClass('force-redraw'); // Force re-draw to prevent missing placeholder on safari.
                        textarea.attr('placeholder', self.langstring.editorplaceholder);
                    } else {
                        editorcontentwrap.attr('data-placeholder', '');
                        textarea.attr('placeholder', '');
                        // Once placeholder is removed never add again.
                        self.canAddPlaceHolder = false;
                        return;
                    }
                    // Check again, needed as Draft saved text can be added at any time in page load.
                    setTimeout(function() {
                        self.addRemovePlaceHolder(editorcontent, editorcontentwrap, textarea);
                    }, 250);
                },

                /*
                 * Bind event to disable post button when text area content is empty.
                 * */
                bindEditorEvent: function(formSelector) {
                    var self = this;
                    var uniqid = Date.now();
                    var key = 'textchange' + uniqid;

                    var submitBtn = formSelector.find('#id_submitbutton');
                    submitBtn.addClass('disabled');
                    var textareaSelector = formSelector.find('textarea[id^="id_editor_question_"]');
                    textareaSelector.on('change', function() {
                        M.util.js_pending(key);
                        if (self.emptyContent.indexOf($(this).val()) > -1) {
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
                }
            };
        };
    });

<?php
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

namespace mod_studentquiz\commentarea;

defined('MOODLE_INTERNAL') || die();

use mod_studentquiz\utils;

/**
 * Comment for comment area
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class comment {

    /** @var int */
    const SHORTEN_LENGTH = 160;

    /** @var string - Link to page when user press report button. */
    const ABUSE_PAGE = '/mod/studentquiz/comment-report.php';

    const EDITABLE_TIME = 600;

    /** @var \question_bank - Question. */
    private $question;

    /** @var object - Current comment. */
    private $data;

    /** @var comment|null - Parent of current comment */
    private $parent;

    /** @var array - All replies of current comment. */
    private $children = [];

    /** @var string - Describe of error. */
    private $describe;

    /** @var string - Time format. */
    private $timeformat;

    /** @var string - Fullname of creator show as anonymous if active anonym. */
    private $creatoranonymfullname;

    /**
     * Constructor
     *
     * @param question $question Question
     * @param $data
     * @param comment|null $parent - Parent data, null if dont have parent
     */
    public function __construct(question $question, $data, $parent = null) {
        // Extract the user details into Moodle user-like objects.
        if (property_exists($data, 'u_id')) {
            $data->user = utils::extract_subobject($data, 'u_');
            $data->edituser = utils::extract_subobject($data, 'eu_');
            $data->deleteuser = utils::extract_subobject($data, 'du_');
        }

        $this->question = $question;
        $this->data = $data;
        $this->parent = $parent;
        $this->describe = null;
        $this->timeformat = get_string('strftimedatetime', 'langconfig');
        $this->creatoranonymfullname = get_string('creator_anonym_fullname', 'langconfig');

    }

    /**
     * Get logged in user.
     *
     * @return mixed|object
     */
    public function get_logged_in_user() {
        return $this->question->get_user();
    }

    /**
     * Get all replies of current comment.
     *
     * @return array
     */
    public function get_replies() {
        return $this->children;
    }

    /**
     * Add child to current comment.
     *
     * @param $child
     */
    public function add_child($child) {
        $this->children[] = $child;
    }

    /**
     * Get comment ID.
     *
     * @return mixed
     */
    public function get_id() {
        return $this->data->id;
    }

    /**
     * Get user that created comment.
     *
     * @return mixed
     */
    public function get_user() {
        return $this->data->user;
    }

    /**
     * Get user that edited comment.
     *
     * @return mixed
     */
    public function get_edit_user() {
        return $this->data->edituser;
    }

    /**
     * Get user that deleted comment.
     *
     * @return mixed
     */
    public function get_delete_user() {
        return $this->data->deleteuser;
    }

    /**
     * Get question of comment.
     *
     * @return question|\question_bank
     */
    public function get_question() {
        return $this->question;
    }

    /**
     * Get describe error.
     *
     * @return string
     */
    public function get_describe() {
        return $this->describe;
    }

    /**
     * Edit permission.
     *
     * @return bool
     */
    public function can_edit() {
        // Current we dont have edit comment feature, so FALSE.
        return false;
    }

    /**
     * Get limited time user can edit comment.
     *
     * @return int
     */
    public function get_editable_time() {
        return $this->get_created() + self::EDITABLE_TIME;
    }

    /**
     * If not moderator, then only allow delete for 10 minutes.
     *
     * @return bool
     */
    public function can_delete() {
        if ($this->is_deleted()) {
            $this->describe = get_string('describe_already_deleted', 'mod_studentquiz');
            return false;
        }
        if (!$this->is_moderator()) {
            if ($this->data->userid != $this->get_logged_in_user()->id) {
                $this->describe = get_string('describe_not_creator', 'mod_studentquiz');
                return false;
            }
            if (time() > $this->get_editable_time()) {
                $this->describe = get_string('describe_out_of_time_edit', 'mod_studentquiz');
                return false;
            }
        }
        return true;
    }

    /**
     * Undelete permission.
     *
     * @return bool
     */
    public function can_undelete() {
        if (!$this->is_deleted()) {
            $this->describe = get_string('describe_not_deleted', 'mod_studentquiz');
            return false;
        }
        if (!$this->is_moderator()) {
            if ($this->data->userid != $this->get_logged_in_user()->id) {
                $this->describe = get_string('describe_not_creator', 'mod_studentquiz');
                return false;
            }
            if (time() > $this->get_editable_time()) {
                $this->describe = get_string('describe_out_of_time_edit', 'mod_studentquiz');
                return false;
            }
        }
        return true;
    }

    /**
     * Report permission.
     *
     * @return bool
     */
    public function can_report() {
        if ($this->is_moderator()) {
            return true;
        }
        if ($this->get_logged_in_user()->id != $this->data->userid) {
            return true;
        }
        return false;
    }

    /**
     * View deleted permission.
     *
     * @return bool
     */
    public function can_view_deleted() {
        if ($this->is_moderator()) {
            return true;
        }
        return false;
    }

    /**
     * Can reply permission
     *
     * @return bool
     */
    public function can_reply() {
        if ($this->data->parentid) {
            $this->describe = get_string('onlyrootcommentcanreply', 'mod_studentquiz');
            return false;
        }
        return true;
    }

    /**
     * Check if this comment is deleted.
     *
     * @return bool
     */
    public function is_deleted() {
        $deleted = $this->get_deleted();
        if (is_null($deleted) || $deleted == 0) {
            return false;
        }
        return true;
    }

    /**
     * Get deleted field.
     *
     * @return mixed
     */
    public function get_deleted() {
        return $this->data->deleted;
    }

    /**
     * Get created field.
     *
     * @return mixed
     */
    public function get_created() {
        return $this->data->created;
    }

    /**
     * Get modified field.
     *
     * @return mixed
     */
    public function get_modified() {
        return $this->data->modified;
    }

    /**
     * Get deleted time.
     *
     * @return int|string
     */
    public function get_deleted_time() {
        return $this->is_deleted() ? userdate($this->get_deleted(), $this->timeformat) : 0;
    }

    /**
     * Can post anonymous.
     *
     * @return bool
     */
    public function can_post_anonymously() {
        return true;
    }

    /**
     * users can't see other comment authors user names except ismoderator
     *
     * @return bool
     * @throws \coding_exception
     */
    public function can_view_username() {
        if ($this->is_moderator()) {
            return true;
        }
        $context = $this->get_question()->get_context();
        if (has_capability('mod/studentquiz:unhideanonymous', $context)) {
            return true;
        }
        return !$this->get_question()->get_studentquiz()->anonymrank;
    }

    /**
     * Check if current user is mod.
     *
     * @return bool
     */
    public function is_moderator() {
        $context = $this->get_question()->get_context();
        return has_capability('mod/studentquiz:manage', $context);
    }

    /**
     * Check if current user is comment creator.
     *
     * @return bool
     */
    public function is_creator() {
        if ($this->get_logged_in_user()->id == $this->data->userid) {
            return true;
        }
        return false;
    }

    /**
     * Force commenting permission.
     *
     * @return bool
     */
    public function can_force_commenting() {
        $studentquiz = $this->get_question()->get_studentquiz();
        return boolval($studentquiz->forcecommenting);
    }

    /**
     * Get total replies.
     *
     * @return int
     */
    public function get_total_replies($includedeleted = true) {
        $replies = $this->get_replies();
        if ($includedeleted) {
            return count($replies);
        }
        // Count only un-deleted post.
        $count = 0;
        foreach ($replies as $reply) {
            if (!$reply->is_deleted()) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Convert data to object (use for api response).
     *
     * @return \stdClass
     */
    public function convert_to_object() {
        $config = $this->get_question()->get_config();
        $comment = $this->data;
        $data = new \stdClass();
        $data->id = $comment->id;
        $data->questionid = $comment->questionid;
        $data->parentid = $comment->parentid;
        $data->content = $comment->comment;
        $data->shortcontent = utils::nice_shorten_text(strip_tags($comment->comment, '<img>'), self::SHORTEN_LENGTH);
        $data->numberofreply = $this->get_total_replies(false);
        $data->canedit = $this->can_edit();
        $data->candelete = $this->can_delete();
        $data->canreport = $this->can_report();
        $data->canundelete = $this->can_undelete();
        $data->canviewdeleted = $this->can_view_deleted();
        $data->canreply = $this->can_reply();
        $deleteuser = $this->get_delete_user();
        $data->deleteuser = new \stdClass();
        // Check to parse deleted item if only existed.
        $data->deletedtime = $this->get_deleted_time();
        $data->canviewanon = $this->can_post_anonymously();
        $data->iscreator = $this->is_creator();
        $data->rownumber = $comment->rownumber;
        // Check is this post is deleted and user permission to view deleted post.
        if ($this->is_deleted() && !$data->canviewdeleted) {
            // If this post is deleted and user don't have permission to view then we hide following information.
            $data->title = '';
            $data->authorname = '';
            $data->authorid = -1;
            $data->authorprofile = '';
            $data->posttime = '';
            $data->lastedittime = '';
            $data->deleteuser->id = 0;
            $data->deleteuser->firstname = '';
            $data->deleteuser->lastname = '';
            $data->deleteuser->profileurl = '';
        } else {
            if ($this->can_view_username()) {
                $data->authorname = fullname($this->get_user());
                $data->authorid = $comment->userid;
                $data->authorprofile = $config->wwwroot . '/user/view.php?id=' . $comment->userid;
            } else {
                $data->authorname = 'Anonymous Student #' . $data->rownumber;
                $data->authorid = -1;
                $data->authorprofile = '';
            }
            $data->posttime = userdate($this->get_created(), $this->timeformat);
            $data->lastedittime = userdate($this->get_modified(), $this->timeformat);
            $data->deleteuser->id = $deleteuser->id;
            $data->deleteuser->firstname = $deleteuser->firstname;
            $data->deleteuser->lastname = $deleteuser->lastname;
            $data->deleteuser->profileurl = (new \moodle_url('/user/view.php', [
                    'id' => $deleteuser->id
            ]))->out();
        }
        // Add report link if report enabled.
        if ($data->canreport) {
            $reportabuselink = $config->wwwroot . self::ABUSE_PAGE;
            $reportabuselink = (new \moodle_url($reportabuselink, [
                    'commentid' => $data->id
            ]))->out();
            $data->reportlink = $reportabuselink;
        }
        return $data;
    }

    /**
     * Delete method for this comment.
     *
     * @param bool $log
     * @return int;
     */
    public function delete($log = false) {
        global $DB, $USER;
        $transaction = $DB->start_delegated_transaction();
        $data = new \stdClass();
        $data->id = $this->data->id;
        $data->deleted = time();
        $data->deleteuserid = $USER->id;
        $id = $DB->update_record('studentquiz_comment', $data);
        if ($log) {
            $question = $this->get_question();
            $this->log($question::COMMENT_DELETED, $data);
        }
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Undelete method for this comment.
     *
     * @param bool $log
     * @return bool
     */
    public function undelete($log = false) {
        global $DB, $USER;
        $transaction = $DB->start_delegated_transaction();
        $data = new \stdClass();
        $data->id = $this->data->id;
        $data->deleted = 0;
        $data->deleteuserid = null;
        $data->modified = time();
        $data->edituserid = $USER->id;
        $id = $DB->update_record('studentquiz_comment', $data);
        if ($log) {
            $question = $this->get_question();
            $this->log($question::COMMENT_DELETED, $data);
        }
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Access log function in question class
     *
     * @param $action
     * @param $data
     */
    public function log($action, $data) {
        return $this->question->log($action, $data);
    }
}

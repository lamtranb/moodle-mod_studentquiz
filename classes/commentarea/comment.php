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
 * Comment for comment area.
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
    const ABUSE_PAGE = '/mod/studentquiz/report.php';

    const EDITABLE_TIME = 600;

    /** @var \question_bank - Question. */
    private $question;

    /** @var container - Container of comment area. It stored studentquiz, question, context v.v... */
    private $container;

    /** @var object - Current comment. */
    private $data;

    /** @var comment|null - Parent of current comment. */
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
     * @param container $container - Container Comment Area.
     * @param $data
     * @param comment|null $parent - Parent data, null if dont have parent.
     */
    public function __construct(container $container, $data, $parent = null) {
        // Get user data from users list.
        $data->user = $container->get_user_from_user_list($data->userid);
        $data->deleteuser =  $container->get_user_from_user_list($data->deleteuserid);

        $this->container = $container;
        $this->question = $this->get_container()->get_question();
        $this->data = $data;
        $this->parent = $parent;
        $this->describe = null;
        $this->timeformat = get_string('strftimedatetime', 'langconfig');
        $this->creatoranonymfullname = get_string('creator_anonym_fullname', 'studentquiz');
    }

    /**
     * Container of comment area.
     *
     * @return container
     */
    public function get_container() {
        return $this->container;
    }

    /**
     * Get logged in user.
     *
     * @return mixed|object
     */
    public function get_logged_in_user() {
        return $this->get_container()->get_user();
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
     * @return \question_bank
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
        return true;
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
        if (!$this->is_root_comment()) {
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
        if ($deleted == 0) {
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
     * Get deleted time.
     *
     * @return int|string
     */
    public function get_deleted_time() {
        return $this->is_deleted() ? userdate($this->get_deleted(), $this->timeformat) : 0;
    }

    /**
     * Users can't see other comment authors user names except ismoderator.
     *
     * @return bool
     * @throws \coding_exception
     */
    public function can_view_username() {
        if ($this->is_moderator()) {
            return true;
        }
        $container = $this->get_container();
        $context = $container->get_context();
        if (has_capability('mod/studentquiz:unhideanonymous', $context)) {
            return true;
        }
        return !$container->get_studentquiz()->anonymrank;
    }

    /**
     * Check if current user is mod.
     *
     * @return bool
     */
    public function is_moderator() {
        $context = $this->get_container()->get_context();
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

    public function is_root_comment() {
        return $this->data->parentid == $this->get_container()::PARENTID;
    }

    /**
     * Convert data to object (use for api response).
     *
     * @return \stdClass
     */
    public function convert_to_object() {
        $config = $this->get_container()->get_config();
        $comment = $this->data;
        $data = new \stdClass();
        $data->id = $comment->id;
        $data->questionid = $comment->questionid;
        $data->parentid = $comment->parentid;
        $data->content = $comment->comment;
        $data->shortcontent = utils::nice_shorten_text(strip_tags($comment->comment, '<img>'), self::SHORTEN_LENGTH);
        $data->numberofreply = $this->get_total_replies(false);
        $data->plural = $data->numberofreply == 0 || $data->numberofreply > 1;
        $data->candelete = $this->can_delete();
        $data->canreport = $this->can_report();
        $data->canundelete = $this->can_undelete();
        $data->canviewdeleted = $this->can_view_deleted();
        $data->canreply = $this->can_reply();
        $data->deleteuser = new \stdClass();
        $data->deleted = $this->is_deleted();
        $data->deletedtime = $this->get_deleted_time();
        $data->iscreator = $this->is_creator();
        // Row number is use as username 'Anonymous Student #' see line 412.
        $data->rownumber = isset($comment->rownumber) ? $comment->rownumber : $comment->id;
        $data->ispost = $this->is_root_comment();
        // Check is this comment is deleted and user permission to view deleted comment.
        if ($this->is_deleted() && !$data->canviewdeleted) {
            // If this comment is deleted and user don't have permission to view then we hide following information.
            $data->title = '';
            $data->authorname = '';
            $data->authorid = -1;
            $data->authorprofile = '';
            $data->posttime = '';
            $data->deleteuser->id = 0;
            $data->deleteuser->firstname = '';
            $data->deleteuser->lastname = '';
            $data->deleteuser->profileurl = '';
        } else {
            if ($this->can_view_username()) {
                $data->authorname = $this->get_user()->fullname;
                $data->authorid = $comment->userid;
                $data->authorprofile = $config->wwwroot . '/user/view.php?id=' . $comment->userid;
            } else {
                $data->authorname = 'Anonymous Student #' . $data->rownumber;
                $data->authorid = -1;
                $data->authorprofile = '';
            }
            $data->posttime = userdate($this->get_created(), $this->timeformat);

            if ($this->is_deleted()) {
                $deleteuser = $this->get_delete_user();
                $data->deleteuser->id = $deleteuser->id;
                $data->deleteuser->firstname = $deleteuser->firstname;
                $data->deleteuser->lastname = $deleteuser->lastname;
                $data->deleteuser->profileurl = (new \moodle_url('/user/view.php', [
                        'id' => $deleteuser->id
                ]))->out();
            }
            else {
                $data->deleteuser->id = 0;
                $data->deleteuser->firstname = '';
                $data->deleteuser->lastname = '';
                $data->deleteuser->profileurl = '';
            }
        }
        // Add report link if report enabled.
        if ($data->canreport) {
            $data->reportlink = $this->get_abuse_link($data->id);
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
            $container = $this->get_container();
            $container->log($container::COMMENT_DELETED, $data);
        }
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Generate report link.
     *
     * @param int $commentid
     * @return string
     * @throws \moodle_exception
     */
    public function get_abuse_link($commentid) {
        $config = $this->get_container()->get_config();
        $questiondata = $this->get_container()->get_question();
        return (new \moodle_url($config->wwwroot . self::ABUSE_PAGE, [
                'cmid' => $this->get_container()->get_cmid(),
                'questionid' => $questiondata->id,
                'commentid' => $commentid
        ]))->out();
    }
}

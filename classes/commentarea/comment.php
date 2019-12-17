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

    /** @var string - User profile_url */
    const USER_PROFILE_URL = '/user/view.php';

    /** @var int - Shorten text with maximum length. */
    const SHORTEN_LENGTH = 160;

    /** @var string - Allowable tags when shorten text. */
    const ALLOWABLE_TAGS = '<img>';

    /** @var int - Comment/reply can only be editable within 600 seconds. */
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
        $data->deleteuser = $container->get_user_from_user_list($data->deleteuserid);

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
        $allow = true;
        if ($this->is_deleted()) {
            $this->describe = get_string('describe_already_deleted', 'mod_studentquiz');
            $allow = false;
        } else if (!$this->is_moderator()) {
            if ($this->data->userid != $this->get_logged_in_user()->id) {
                $this->describe = get_string('describe_not_creator', 'mod_studentquiz');
                $allow = false;
            }
            if (time() > $this->get_editable_time()) {
                $this->describe = get_string('describe_out_of_time_edit', 'mod_studentquiz');
                $allow = false;
            }
        }
        return $allow;
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
     * Can reply permission.
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
     * @param bool $includedeleted - Count include deleted comment/reply.
     * @return int - Number of replies.
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
     * Check if current comment is root comment or reply.
     *
     * @return bool
     */
    public function is_root_comment() {
        return $this->data->parentid == $this->get_container()::PARENTID;
    }

    /**
     * Convert data to object (use for api response).
     *
     * @return \stdClass
     */
    public function convert_to_object() {
        $comment = $this->data;
        $object = new \stdClass();
        $object->id = $comment->id;
        $object->questionid = $comment->questionid;
        $object->parentid = $comment->parentid;
        $object->content = $comment->comment;
        $object->shortcontent = utils::nice_shorten_text(strip_tags($comment->comment, self::ALLOWABLE_TAGS), self::SHORTEN_LENGTH);
        $object->numberofreply = $this->get_total_replies(false);
        $object->plural = $object->numberofreply == 0 || $object->numberofreply > 1;
        $object->candelete = $this->can_delete();
        $object->canviewdeleted = $this->can_view_deleted();
        $object->canreply = $this->can_reply();
        $object->deleteuser = new \stdClass();
        $object->deleted = $this->is_deleted();
        $object->deletedtime = $this->get_deleted_time();
        $object->iscreator = $this->is_creator();
        // Row number is use as username 'Anonymous Student #' see line 412.
        $object->rownumber = isset($comment->rownumber) ? $comment->rownumber : $comment->id;
        $object->root = $this->is_root_comment();
        // Check is this comment is deleted and user permission to view deleted comment.
        if ($this->is_deleted() && !$object->canviewdeleted) {
            // If this comment is deleted and user don't have permission to view then we hide following information.
            $object->title = '';
            $object->authorname = '';
            $object->authorid = -1;
            $object->authorprofile = '';
            $object->posttime = '';
            $object->deleteuser->id = 0;
            $object->deleteuser->firstname = '';
            $object->deleteuser->lastname = '';
            $object->deleteuser->profileurl = '';
        } else {
            if ($this->can_view_username()) {
                $object->authorname = $this->get_user()->fullname;
                $object->authorid = $comment->userid;
                $object->authorprofile = $this->get_user_profile_url($comment->userid);
            } else {
                $object->authorname = get_string('anonnymous_user_name', 'mod_studentquiz', $object->rownumber);
                $object->authorid = -1;
                $object->authorprofile = '';
            }
            $object->posttime = userdate($this->get_created(), $this->timeformat);
            if ($this->is_deleted()) {
                $deleteuser = $this->get_delete_user();
                $object->deleteuser->id = $deleteuser->id;
                $object->deleteuser->firstname = $deleteuser->firstname;
                $object->deleteuser->lastname = $deleteuser->lastname;
                $object->deleteuser->profileurl = $this->get_user_profile_url($deleteuser->id);
            } else {
                $object->deleteuser->id = 0;
                $object->deleteuser->firstname = '';
                $object->deleteuser->lastname = '';
                $object->deleteuser->profileurl = '';
            }
        }
        return $object;
    }

    /**
     * Delete method for this comment.
     *
     * @param bool $log
     * @return int;
     */
    public function delete($log = false) {
        global $DB;
        $transaction = $DB->start_delegated_transaction();
        $data = new \stdClass();
        $data->id = $this->data->id;
        $data->deleted = time();
        $data->deleteuserid = $this->get_container()->get_user()->id;
        $id = $DB->update_record('studentquiz_comment', $data);
        if ($log) {
            $container = $this->get_container();
            $this->get_container()->log($container::COMMENT_DELETED, $data);
        }
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Get user profile url.
     *
     * @param $id
     * @return string
     */
    public function get_user_profile_url($id) {
        return (new \moodle_url(self::USER_PROFILE_URL, compact('id')))->out();
    }
}

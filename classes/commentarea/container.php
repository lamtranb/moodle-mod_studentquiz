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

/**
 * Container class for comment area.
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class container {

    /** @var int - Number of comments to show by default. */
    const NUMBER_COMMENT_TO_SHOW_BY_DEFAULT = 5;

    const PARENTID = 0;

    const SHOW_ALL = 0;

    const COMMENT_CREATED = 'comment_created';
    const COMMENT_DELETED = 'comment_deleted';

    /** @var \question_definition $question - Question class. */
    private $question;

    /** @var \stdClass $cm - Module. */
    private $cm;

    /** @var \stdClass $context - Context. */
    private $context;

    /** @var array - Array of comments. */
    private $comments;

    /** @var object|\stdClass - Studentquiz data. */
    private $studentquiz;

    /** @var string - Basic order to get comments. */
    private $order = 'created ASC';

    /** @var object|\stdClass - Config of Moodle. Only call it once when __construct */
    private $config;

    /** @var object|\stdClass - Current user of Moodle. Only call it once when __construct */
    private $user;

    /** @var object|\stdClass - Current course of Moodle. Only call it once when __construct */
    private $course;

    /**

    /**
     * @var array List of users has comments.
     */
    private $userlist = [];

    /**
     * mod_studentquiz_commentarea_list constructor.
     *
     * @param $studentquiz
     * @param \question_definition $question
     * @param $cm
     * @param $context
     */
    public function __construct($studentquiz, \question_definition $question, $cm, $context) {
        global $CFG, $USER, $COURSE;
        $this->studentquiz = $studentquiz;
        $this->question = $question;
        $this->cm = $cm;
        $this->context = $context;
        $this->comments = null;
        $this->config = $CFG;
        $this->user = clone $USER;
        $this->course = clone $COURSE;
    }

    /**
     * Get current user
     *
     * @return mixed
     */
    public function get_user() {
        return $this->user;
    }

    /**
     * Get Config of Moodle
     *
     * @return mixed
     */
    public function get_config() {
        return $this->config;
    }

    /**
     * Get module.
     *
     * @return mixed
     */
    public function get_cm() {
        return $this->cm;
    }

    /**
     * Get course.
     *
     * @return mixed
     */
    public function get_course() {
        return $this->course;
    }

    /**
     * Get question.
     *
     * @return \question_definition
     */
    public function get_question() {
        return $this->question;
    }

    /**
     * Get context.
     *
     * @return mixed
     */
    public function get_context() {
        return $this->context;
    }

    /**
     * Get module id
     *
     * @return mixed
     */
    public function get_cmid() {
        return $this->get_cm()->id;
    }

    /**
     * Get studentquiz.
     *
     * @return object|\stdClass
     */
    public function get_studentquiz() {
        return $this->studentquiz;
    }

    /**
     * Fetch all comments.
     *
     * @param $numbertoshow
     * @return array
     */
    public function fetch_all($numbertoshow) {
        // When we get all comments, sort as oldest to newest
        if ($numbertoshow === self::SHOW_ALL) {
            $order = $this->order;
        } else {
            // When we get limit, get the latest comments.
            $order = 'created DESC';
        }
        return $this->fetch($numbertoshow, ' AND parentid = ?', [self::PARENTID], $order);
    }

    /**
     * Fetch comments.
     *
     * @param $numbertoshow
     * @param $where
     * @param $whereparams
     * @param $order
     * @param $refresh
     * @return array
     */
    public function fetch($numbertoshow, $where = '', $whereparams = [], $order = false, $refresh = false) {
        if (!$this->comments || $refresh) {
            $this->comments = $this->query_comments($where, $whereparams, $order, $numbertoshow);
        }
        $comments = $this->comments;
        $list = [];
        // Check if we have any comments.
        if ($comments) {
            // we need to get users
            $this->set_user_list($comments);
            // Obtain comments relationships.
            $tree = $this->build_tree($comments);
            foreach ($tree as $rootid => $children) {
                $comment = $this->build_comment($comments[$rootid]);
                if (!empty($children)) {
                    foreach ($children as $childid) {
                        $reply = $this->build_comment($comments[$childid], $comment);
                        $comment->add_child($reply);
                    }
                }
                $list[] = $comment;
            }
        }
        return $list;
    }

    /**
     * Build tree comment.
     *
     * @param $comments
     * @return array
     */
    public function build_tree($comments) {
        $tree = [];
        foreach ($comments as $id => $comment) {
            $parentid = $comment->parentid;
            // Add root comments.
            if ($parentid == self::PARENTID) {
                if (!isset($tree[$id])) {
                    $tree[$id] = [];
                }
                continue;
            }
            if (!isset($tree[$parentid])) {
                $tree[$parentid] = [];
            }
            $tree[$parentid][] = $id;
        }
        return $tree;
    }

    /**
     * Count all comments
     *
     * @return int
     */
    public function get_num_comments() {
        global $DB;
        $count = $DB->count_records('studentquiz_comment', [
                'questionid' => $this->get_question()->id,
                'deleted' => 0
        ]);
        return $count;
    }

    /**
     * Query for comments
     *
     * @param string $where - Comment conditions.
     * @param array $whereparams - Params for comment conditions.
     * @param bool $order - Order.
     * @return array - Array of comment.
     */
    public function query_comments($where = '', $whereparams = [], $order = false, $limit = false) {
        global $DB;
        $basicwhere = 'questionid = ?';
        $where = !$where ? $basicwhere : $basicwhere . ' ' . $where;
        $whereparams = array_merge([$this->question->id], $whereparams);
        // Set order.
        if ($order === false) {
            $order = $this->order;
        }
        // Set limit.
        if (!$limit || !is_numeric($limit) || $limit == self::SHOW_ALL) {
            $limit = '';
        } else {
            $limit = 'LIMIT ' . $limit;
        }
        $query = "
        WITH
        root AS
        (
            SELECT * 
            FROM {studentquiz_comment} 
            WHERE
                $where
            ORDER BY 
                $order 
            $limit
        )
        (SELECT *, ROW_NUMBER() OVER(ORDER BY created) AS rownumber FROM root)
        UNION
        (SELECT child.*, ROW_NUMBER() OVER(ORDER BY created) + (SELECT COUNT(*) FROM root) AS rownumber 
            FROM {studentquiz_comment} AS child 
            WHERE child.parentid IN (SELECT id FROM root))
        ORDER BY
            rownumber ASC";
        // Retrieve comments from question.
        $results = $DB->get_records_sql($query, $whereparams);
        return $results;
    }

    /**
     * Get a comment and its replies by comment id.
     *
     * @param int $id
     * @return comment
     */
    public function query_comment_by_id($id) {
        global $DB;

        $query = "SELECT * from {studentquiz_comment} WHERE id = ?";
        // First fetch to check it's a comment or reply.
        $record = $DB->get_record_sql($query, [$id]);

        if (!$record) {
            throw new \moodle_exception('cannotgetcomment', 'mod_studenquiz');
        }

        // It is a reply.
        if ($record->parentid != self::PARENTID) {
            $parentdata = $DB->get_record_sql($query, [$record->parentid]);
            $this->set_user_list([$record]);
            $comment = $this->build_comment($record, $parentdata);
            return $comment;
        }

        // It's a comment.
        $comments = $this->fetch(1, ' AND parentid = ? AND id = ?', [self::PARENTID, $record->id], false, true);
        if (!isset($comments[0])) {
            throw new \moodle_exception('cannotgetcomment', 'mod_studenquiz');
        }
        return $comments[0];
    }

    /**
     * Build data comment into comment class.
     *
     * @param $commentdata - Comment data.
     * @param null $parentdata - Parent comment data, null if top level comment.
     * @return comment
     */
    private function build_comment($commentdata, $parentdata = null) {
        return new comment($this, $commentdata, $parentdata);
    }

    /**
     * Create new comment.
     *
     * @param $data - Data of comment will be created.
     * @param bool $log - Write log - true will write.
     * @return int - ID of created comment.
     */
    public function create_comment($data, $log = true) {
        global $DB;
        $transaction = $DB->start_delegated_transaction();
        $comment = new \stdClass();
        $comment->comment = $data->message['text'];
        $comment->questionid = $this->question->id;
        $comment->userid = $this->get_user()->id;
        $comment->parentid = $data->replyto != self::PARENTID ? $data->replyto : self::PARENTID;
        $comment->created = time();
        $id = $DB->insert_record('studentquiz_comment', $comment);
        if ($log) {
            $this->log(self::COMMENT_CREATED, $comment);
        }
        $transaction->allow_commit();
        return $id;
    }

    /**
     * Writing log.
     *
     * @param string $action - Action name.
     * @param $data - data of comment.
     */
    public function log($action, $data) {
        $cm = $this->get_cm();
        if ($action == self::COMMENT_CREATED) {
            mod_studentquiz_notify_comment_added($data, $this->get_course(), $cm);
        } else if ($action == self::COMMENT_DELETED) {
            mod_studentquiz_notify_comment_deleted($data, $this->get_course(), $cm);
        }
    }

    /**
     * Set users list.
     *
     * @param array $comments
     * @throws \coding_exception
     * @throws \dml_exception
     */
    public function set_user_list($comments) {
        global $DB;
        $userids = [];
        foreach ($comments as $comment) {
            if (!in_array($comment->userid, $userids)) {
                $userids[] = $comment->userid;
            }
            if (!in_array($comment->deleteuserid, $userids)) {
                $userids[] = $comment->deleteuserid;
            }
        }
        // Retrieve users from db.
        list($idsql, $params) = $DB->get_in_or_equal($userids);
        $fields = get_all_user_name_fields(true);
        $query = "SELECT id, $fields
                FROM {user}
                WHERE id $idsql";
        $users = $DB->get_records_sql($query, $params);
        foreach ($users as $user) {
            $user->fullname = fullname($user);
            $this->userlist[$user->id] = $user;
        }
    }

    /**
     * Get user from users list.
     *
     * @param $id
     * @return mixed|null
     */
    public function get_user_from_user_list($id) {
        if (is_null($id) || !isset($this->userlist[$id])) {
            return null;
        }
        return $this->userlist[$id];
    }
}

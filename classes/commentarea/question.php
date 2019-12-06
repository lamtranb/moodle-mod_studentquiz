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
 * Question class for comment area
 *
 * @package mod
 * @subpackage studentquiz
 * @copyright 2019 The Open University
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class question {

    /** @var int - Number of comments to show by default. */
    const NUMBER_COMMENT_TO_SHOW_BY_DEFAULT = 5;

    const COMMENT_CREATED = 'comment_created';
    const COMMENT_DELETED = 'comment_deleted';
    const COMMENT_UNDELETED = 'comment_undeleted';

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
    private $order = '(cmt.parentid IS NOT NULL),
    case when cmt.parentid is null then cmt.created end asc,
    case when cmt.parentid is not null then cmt.created end asc';

    /** @var object|\stdClass - Config of Moodle. Only call it once when __construct */
    private $config;

    /** @var object|\stdClass - Current user of Moodle. Only call it once when __construct */
    private $user;

    /** @var object|\stdClass - Current course of Moodle. Only call it once when __construct */
    private $course;

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
     * Get first level comments belong to this question.
     *
     * @param $numbertoshow integer Number of first posts to show, "0" to show all posts.
     * @return array Array of stdClass contain posts.
     */
    public function get_comments($numbertoshow, $where = '', $whereparams = [], $order = false) {
        // Get array of comments.
        $comments = $this->get_built_comments($where, $whereparams, $order);
        if ($numbertoshow == 0) {
            return $comments;
        }
        $res = [];
        // Get first latest comments.
        $index = count($comments) - 1;
        while ($numbertoshow > 0 && $index >= 0) {
            $res[] = $comments[$index];

            $index--;
            $numbertoshow--;
        }
        return $res;
    }

    /**
     * Get built comments.
     *
     * @param $where
     * @param $whereparams
     * @param $order
     * @return array
     */
    public function get_built_comments($where, $whereparams, $order) {
        if (!$this->comments) {
            $this->comments = $this->query_comments($where, $whereparams, $order);
        }
        $comments = $this->comments;
        // Obtain comments relationships.
        $tree = $this->build_tree($comments);
        $list = [];
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
            if (is_null($parentid)) {
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
        $count = 0;
        $comments = $this->comments;
        foreach ($comments as $comment) {
            if ($comment->deleted) {
                continue;
            }
            $count++;
        }
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
    public function query_comments($where = '', $whereparams = [], $order = false) {
        global $DB;
        $basicwhere = 'cmt.questionid = ?';
        $where = !$where ? $basicwhere : $basicwhere . ' ' . $where;
        $whereparams = array_merge([$this->question->id], $whereparams);
        if ($order === false) {
            $order = $this->order;
        }
        $query = "
            SELECT cmt.*, ROW_NUMBER() OVER() AS rownumber,
            " . utils::select_username_fields('u', true) . ",
            " . utils::select_username_fields('eu') . ",
            " . utils::select_username_fields('du') . "
            FROM
                {studentquiz_comment} cmt
                INNER JOIN {user} u ON cmt.userid = u.id
                LEFT JOIN {user} eu ON cmt.edituserid = eu.id
                LEFT JOIN {user} du ON cmt.deleteuserid = du.id
            WHERE
                $where
            ORDER BY
                $order
        ";
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
        $where = 'AND (cmt.id = ? OR cmt.parentid = ?)';
        $whereparams = [$id, $id];
        // Retrieve comments from question.
        $comments = $this->query_comments($where, $whereparams);
        if (!$comments) {
            throw new \moodle_exception('cannotgetcomment', 'mod_studenquiz');
        }
        // Get current comment.
        $comment = $this->build_comment($comments[$id]);
        $tree = $this->build_tree($comments);
        // This comment is base comment, we need to get its replies.
        if (isset($tree[$id])) {
            $children = $tree[$id];
            if (!empty($children)) {
                foreach ($children as $childid) {
                    $comment->add_child($this->build_comment($comments[$childid], $comment));
                }
            }
        }
        return $comment;
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
        $comment->parentid = $data->replyto != 0 ? $data->replyto : null;
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
}

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

    /** @var int - Comment root parent id. */
    const PARENTID = 0;

    /** @var int - Default value to show all comments and replies. */
    const SHOW_ALL = 0;

    /** @var string - Created comment event name. */
    const COMMENT_CREATED = 'comment_created';

    /** @var string - Deleted comment event name. */
    const COMMENT_DELETED = 'comment_deleted';

    const SORT_DATE_ASC = 'date_asc';
    const SORT_DATE_DESC = 'date_desc';
    const SORT_FIRSTNAME_ASC = 'forename_asc';
    const SORT_FIRSTNAME_DESC = 'forename_desc';
    const SORT_LASTNAME_ASC = 'surname_asc';
    const SORT_LASTNAME_DESC = 'surname_desc';

    const SORT_DATE = 'date';
    const SORT_FIRSTNAME = 'forename';
    const SORT_LASTNAME = 'surname';

    /** @var array - Mapping db fields with sort define. */
    const SORT_DB_FIELDS = [
            self::SORT_DATE => 'created',
            self::SORT_FIRSTNAME => 'firstname',
            self::SORT_LASTNAME => 'lastname',
    ];

    /** @var array - Default sort. */
    const SORT_FIELDS = [
            self::SORT_DATE
    ];

    /** @var array - Special fields. */
    const SPECIAL_SORT_FIELDS = [
            self::SORT_FIRSTNAME,
            self::SORT_LASTNAME
    ];

    /** @var array - Per sort field has multiple sort features. */
    const SORT_FEATURES = [
            self::SORT_DATE => [
                    self::SORT_DATE_ASC,
                    self::SORT_DATE_DESC
            ],
            self::SORT_FIRSTNAME => [
                    self::SORT_FIRSTNAME_ASC,
                    self::SORT_FIRSTNAME_DESC,
            ],
            self::SORT_LASTNAME => [
                    self::SORT_LASTNAME_ASC,
                    self::SORT_LASTNAME_DESC,
            ]
    ];

    const USER_PREFERENCE_SORT = 'mod_studentquiz_comment_sort';

    /** @var \question_definition $question - Question class. */
    private $question;

    /** @var \stdClass $cm - Module. */
    private $cm;

    /** @var \stdClass $context - Context. */
    private $context;

    /** @var array - Array of stored comments. */
    private $storedcomments;

    /** @var object|\stdClass - Studentquiz data. */
    private $studentquiz;

    /** @var object|\stdClass - Current user of Moodle. Only call it once when __construct */
    private $user;

    /** @var object|\stdClass - Current course of Moodle. Only call it once when __construct */
    private $course;

    /** @var null - Current set limit. */
    private $currentlimit = null;

    /**
     *
     * /**
     * @var array List of users has comments.
     */
    private $userlist = [];

    /**
     * @var array - Reporting Emails.
     */
    private $reportemails = [];

    /** @var string - Current sort feature */
    private $sortfeature;

    private $sortfield;
    private $sortby;

    /**
     * mod_studentquiz_commentarea_list constructor.
     *
     * @param $studentquiz
     * @param \question_definition $question
     * @param $cm
     * @param $context
     * @param string $sort - Sort type.
     */
    public function __construct($studentquiz, \question_definition $question, $cm, $context, $sort = '') {
        global $USER, $COURSE;
        $this->studentquiz = $studentquiz;
        $this->question = $question;
        $this->cm = $cm;
        $this->context = $context;
        $this->storedcomments = null;
        $this->user = clone $USER;
        $this->course = clone $COURSE;
        $this->reportemails = utils::extract_reporting_emails_from_string($studentquiz->reportingemail);
        $this->set_sort_user_preference($sort);
        $this->setup_sort();
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
        return $this->fetch($numbertoshow, ' AND parentid = ?', [self::PARENTID]);
    }

    /**
     * Fetch comments.
     *
     * @param $numbertoshow
     * @param $where
     * @param $whereparams
     * @return array
     */
    public function fetch($numbertoshow, $where = '', $whereparams = []) {
        $this->storedcomments = $this->query_comments($where, $whereparams, $numbertoshow);
        $comments = $this->storedcomments;
        $list = [];
        // Check if we have any comments.
        if ($comments) {
            // We need to get users.
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
     * Count all comments.
     *
     * @return int
     */
    public function get_num_comments() {
        global $DB;
        return $DB->count_records('studentquiz_comment', [
                'questionid' => $this->get_question()->id,
                'deleted' => 0
        ]);
    }

    /**
     * Query for comments
     *
     * @param string $where - Comment conditions.
     * @param array $whereparams - Params for comment conditions.
     * @param bool $limit - Limit comments.
     * @return array - Array of comment.
     */
    public function query_comments($where = '', $whereparams = [], $limit = false) {
        global $DB;
        $basicwhere = 'c.questionid = ?';
        $where = !$where ? $basicwhere : $basicwhere . ' ' . $where;
        $whereparams = array_merge([$this->question->id], $whereparams);

        // Set limit.
        if (is_numeric($limit) && $limit > 0) {
            $this->currentlimit = $limit;
        }
        $limit = $this->currentlimit ? 'LIMIT ' . $this->currentlimit : '';

        // Build sort order.
        $sort = $this->get_sort();

        $orderwhere = 'c.created ASC';
        $join = '';
        $joinselect = '';
        $reverse = '';

        // Note when we get limited comments, we will get the latest comments.
        if ($limit) {
            $orderwhere = 'c.created DESC';
        }

        if ($this->is_special_sort()) {
            $join = 'JOIN {user} u ON u.id = c.userid';
            $sort = $sort . ', '. $orderwhere;
        }

        $query = "
        WITH
        root AS
        (
            SELECT c.*, ROW_NUMBER() OVER(ORDER BY $rowsort) AS rownumber FROM (
                SELECT c.*
                FROM {studentquiz_comment} c
                $join
                WHERE
                    $where
                ORDER BY
                    $sort
                $limit
            ) AS c 
                $reverse
        )
        (SELECT * FROM root)
        UNION
        (SELECT child.*, ROW_NUMBER() OVER(ORDER BY created) + (SELECT COUNT(*) FROM root) AS rownumber
            FROM {studentquiz_comment} AS child
            WHERE child.parentid IN (SELECT id FROM root))
        ORDER BY
            rownumber ASC";
        // Retrieve comments from question.
        return $DB->get_records_sql($query, $whereparams);
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
            return $this->build_comment($record, $parentdata);
        }

        // It's a comment.
        $comments = $this->fetch(1, ' AND c.parentid = ? AND c.id = ?', [self::PARENTID, $record->id]);
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
     * @param \stdClass $data - Data of comment will be created.
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
        $coursemodule = $this->get_cm();
        if ($action == self::COMMENT_CREATED) {
            mod_studentquiz_notify_comment_added($data, $this->get_course(), $coursemodule);
        } else if ($action == self::COMMENT_DELETED) {
            mod_studentquiz_notify_comment_deleted($data, $this->get_course(), $coursemodule);
        }
    }

    /**
     * Set users list.
     *
     * @param array $comments
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
     * @param int $id - Id of user.
     * @return mixed|null
     */
    public function get_user_from_user_list($id) {
        if (is_null($id) || !isset($this->userlist[$id])) {
            return null;
        }
        return $this->userlist[$id];
    }

    /**
     * Get reporting emails list.
     *
     * @return array
     */
    public function get_reporting_emails() {
        return $this->reportemails;
    }

    /**
     * Get anonymous mode.
     *
     * @return bool
     */
    public function anonymous_mode() {
        $context = $this->get_context();
        $studentquiz = $this->get_studentquiz();
        $capability = $studentquiz->anonymrank;
        if (has_capability('mod/studentquiz:unhideanonymous', $context)) {
            $capability = false;
        }
        return $capability;
    }

    public function get_fields() {
        $fields = self::SORT_FIELDS;
        // In anonymous mode, those features is not available.
        if (!$this->anonymous_mode()) {
            $fields = array_merge($fields, self::SPECIAL_SORT_FIELDS);
        }
        return $fields;
    }

    /**
     * Get array of sortable in current context.
     *
     * @return array
     */
    public function get_sortable() {
        return self::extract_sort_features_from_sort_fields($this->get_fields());
    }

    /**
     * Check if current sort feature can be used to sort.
     *
     * @param string $field
     * @return bool
     */
    public function is_sortable($field) {
        return in_array($field, $this->get_sortable());
    }

    /**
     * Set $sortfield and $sortby from user preferences.
     * If not, then create default.
     * If current feature is not available from current context, then return default.
     */
    public function setup_sort() {
        $currentsortfeature = $this->get_sort_from_user_preference();
        // In case we are in anonymous mode, and current sort is not supported, return default sort.
        if ($this->anonymous_mode() && !$this->is_sortable($currentsortfeature)) {
            $currentsortfeature = self::SORT_DATE_ASC;
        }
        $this->sortfeature = $currentsortfeature;
    }

    public function get_sort_from_user_preference() {
        $sort = get_user_preferences(self::USER_PREFERENCE_SORT);
        // In case db row is not found.
        if (is_null($sort)) {
            set_user_preference(self::USER_PREFERENCE_SORT, self::SORT_DATE_ASC);
            $sort = get_user_preferences(self::USER_PREFERENCE_SORT);
        }
        return $sort;
    }

    public function is_special_sort() {
        $specialFields = self::SPECIAL_SORT_FIELDS;
        return in_array($this->sortfeature, self::extract_sort_features_from_sort_fields($specialFields));
    }

    public static function extract_sort_features_from_sort_fields($fields) {
        $sortable = [];
        if (count($fields) > 0) {
            foreach ($fields as $field) {
                if (!isset(self::SORT_FEATURES[$field])) {
                    continue;
                }
                $sortdata = self::SORT_FEATURES[$field];
                $sortable = array_merge($sortable, $sortdata);
            }
        }
        return $sortable;
    }

    /**
     * Convert sort feature to database order.
     *
     * @return array
     */
    public function extract_user_preference_sort($prefix = '') {
        $sort = explode('_', $this->sortfeature);
        $sortfield = self::SORT_DB_FIELDS[$sort[0]];
        $sortby = $sort[1];
        // Build into order query. Example: created_at => 'created asc'.
        $dbsort = $prefix . $sortfield . ' ' . $sortby;
        return [$dbsort, $sortfield, $sortby];
    }

    /**
     * Build query order by.
     *
     * @return string
     */
    public function get_sort() {
        $prefix = 'c.';
        if ($this->is_special_sort()) {
            $prefix = 'u.';
        }
        list($dbsort, $sortfield, $sortby) = $this->extract_user_preference_sort($prefix);
        $this->sortfield = $sortfield;
        $this->sortby = $sortby;
        return $dbsort;
    }

    /**
     * Set user preference sort.
     *
     * @param $string
     * @throws \coding_exception
     */
    public function set_sort_user_preference($string) {
        if ($this->is_sortable($string)) {
            $currentsort = $this->get_sort_from_user_preference();
            // If current sort is different, then update. Otherwise no need to call DB.
            if ($string !== $currentsort) {
                set_user_preference(self::USER_PREFERENCE_SORT, $string);
            }
        }
    }

    public function get_sort_feature() {
        return $this->sortfeature;
    }

    public function get_sort_select() {
        $data = [];
        foreach ($this->get_fields() as $field) {
            $type = 'asc';
            $features = self::SORT_FEATURES[$field];
            if (in_array($this->sortfeature, $features) && $this->sortby === 'desc') {
                $type = 'desc';
            }
            $data[] = [
                    'sortkey' => $field,
                    'sortstring' => \get_string("filter_comment_label_$field", 'studentquiz'),
                    'orderclass' => $type === 'desc' ? 'filter-desc' : 'filter-asc',
                    'ordertype' => $type
            ];
        }
        return $data;
    }
}

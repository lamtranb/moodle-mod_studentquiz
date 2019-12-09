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

/**
 * Unit tests for comment area.
 *
 * @package    mod_studentquiz
 * @copyright  2019 Lam Tran
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die('Direct Access is forbidden!');

use mod_studentquiz\commentarea\comment;

/**
 * Unit tests for comment area.
 *
 * @package    mod_studentquiz
 * @copyright  2019 Lam Tran
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class mod_studentquiz_comment_testcase extends advanced_testcase {

    /**
     * @var stdClass the StudentQuiz activity created in setUp.
     */
    protected $studentquiz;

    /**
     * @var context_module the corresponding activity context.
     */
    protected $context;

    /**
     * @var stdClass the corresponding course_module.
     */
    protected $cm;

    /**
     * @var array the users created in setUp.
     */
    protected $users;

    /**
     * @var array the questions created in setUp.
     */
    protected $questions;

    /** @var mod_studentquiz\commentarea\container */
    protected $commentarea;

    /** @var int - Value of Root comment. */
    protected $rootid;

    /** @var stdClass - Course. */
    protected $course;

    /**
     * Setup for unit test.
     */
    protected function setUp() {
        $this->setAdminUser();
        $this->resetAfterTest();

        global $DB;

        $this->course = $this->getDataGenerator()->create_course();
        $course = $this->course;

        $studentrole = $DB->get_record('role', ['shortname' => 'student']);
        $activity = $this->getDataGenerator()->create_module('studentquiz', array(
                'course' => $course->id,
                'anonymrank' => true,
                'forcecommenting' => 1,
                'publishnewquestion' => 1
        ));
        $this->context = context_module::instance($activity->cmid);
        $this->studentquiz = mod_studentquiz_load_studentquiz($activity->cmid, $this->context->id);
        $this->cm = get_coursemodule_from_id('studentquiz', $activity->cmid);

        // Create users.
        $usernames = ['Student 1'];
        $users = [];
        foreach ($usernames as $username) {
            $user = $this->getDataGenerator()->create_user(['firstname' => $username]);
            $this->getDataGenerator()->enrol_user($user->id, $course->id, $studentrole->id);
            $users[] = $user;
        }
        $this->users = $users;

        // Create questions in questionbank.
        $questiongenerator = $this->getDataGenerator()->get_plugin_generator('core_question');
        $q1 = $questiongenerator->create_question('truefalse', null,
                ['name' => 'TF1', 'category' => $this->studentquiz->categoryid]);
        $q1 = \question_bank::load_question($q1->id);
        $this->questions = [$q1];

        $this->commentarea = new \mod_studentquiz\commentarea\container($this->studentquiz, $q1, $this->cm, $this->context);
        $this->rootid = \mod_studentquiz\commentarea\container::PARENTID;
    }

    private function get_comment_by_id ($id, $convert = true) {
        $comment = $this->commentarea->query_comment_by_id($id);
        if ($convert) {
            $comment = $comment->convert_to_object();
        }
        return $comment;
    }

    /**
     * @param $replyto
     * @param $questionid
     * @param $text
     * @return comment
     */
    private function create_comment($replyto, $questionid, $text, $convert = true) {
        $data = [
                'message' => [
                        'text' => $text,
                        'format' => 1
                ],
                'questionid' => $questionid,
                'cmid' => $this->cm->id,
                'replyto' => $replyto
        ];
        $id = $this->commentarea->create_comment((object) $data);
        return $this->get_comment_by_id($id, $convert);
    }

    /**
     * Test init comment area.
     */
    public function test_initial() {
        $question = $this->questions[0];
        $this->equalTo($question->id, $this->commentarea->get_question()->id);
        $this->equalTo($this->cm->id, $this->commentarea->get_cmid());
        $this->equalTo($this->studentquiz->id, $this->commentarea->get_studentquiz()->id);
        $this->equalTo($this->context->id, $this->commentarea->get_context()->id);
    }

    /**
     * Test create root comment
     */
    public function test_create_root_comment() {
        // Create root comment.
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        $this->assertEquals($text, $comment->content);
        $this->assertEquals($q1->id, $comment->questionid);
        $this->assertEquals($this->rootid, $comment->parentid);
    }

    /**
     * Test create reply.
     */
    public function test_create_reply_comment() {
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $textreply = 'Reply root comment';
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        $reply = $this->create_comment($comment->id, $q1->id, $textreply);
        // Check text reply.
        $this->assertEquals($textreply, $reply->content);
        // Check question id.
        $this->assertEquals($q1->id, $reply->questionid);
        // Check if reply belongs to comment.
        $this->assertEquals($comment->id, $reply->parentid);
    }

    /**
     * Test delete comment.
     */
    public function test_delete_comment() {
        // Create root comment.
        $q1 = $this->questions[0];
        $text = 'Root comment';
        // Dont need to convert to use delete.
        $comment = $this->create_comment($this->rootid, $q1->id, $text, false);
        // Try to delete.
        $comment->delete();
        // Get new data.
        $commentafterdelete = $this->get_comment_by_id($comment->get_id());
        // Delete time now is > 0
        $this->assertTrue($commentafterdelete->deleted > 0);
        // Delete user id now is not null
        $this->assertNotNull($commentafterdelete->deleteuser->id);
    }

    /**
     * Test fetch all comments.
     */
    public function test_fetch_all_comments() {
        $q1 = $this->questions[0];
        $text = 'Root comment';
        $textreply = 'Reply root comment';
        $numreplies = 3;
        $comment = $this->create_comment($this->rootid, $q1->id, $text);
        for ($i = 0; $i < $numreplies; $i++) {
            $this->create_comment($comment->id, $q1->id, $textreply);
        }
        $comments = $this->commentarea->fetch_all(0);

        $data = [];
        /** @var comment $comment */
        foreach ($comments as $key => $comment) {
            $item = $comment->convert_to_object();
            $item->replies = [];
            /** @var comment $reply */
            foreach ($comment->get_replies() as $reply) {
                $item->replies[] = $reply->convert_to_object();
            }
            $data[] = $item;
        }
        // Check total comments.
        $this->assertEquals($numreplies + 1, $this->commentarea->get_num_comments());
        // Check root comment has 3 replies.
        foreach ($data as $v) {
            $this->assertEquals($numreplies, $v->numberofreply);
        }
    }

    /**
     * Test report feature. Turn off by default. Then turn it on.
     */
    public function test_report_feature() {
        global $DB;
        $q1 = $this->questions[0];
        // Need to use comment class functions. Don't use convert to response data.
        $comment = $this->create_comment($this->rootid, $q1->id, 'Test comment', false);
        // Assume that we didn't input any emails for report. It will return false.
        $this->assertFalse($comment->can_report());
        // Turn on report.
        $inputreportemails = 'admin@domain.com;admin1@domail.com';
        $this->studentquiz->reportingemail = $inputreportemails;
        $DB->update_record('studentquiz', $this->studentquiz);
        // Re-init SQ.
        $this->studentquiz = mod_studentquiz_load_studentquiz($this->cm->id, $this->context->id);
        // Re-init comment area.
        $this->commentarea = new mod_studentquiz\commentarea\container($this->studentquiz, $q1, $this->cm, $this->context);
        $comment = $this->get_comment_by_id($comment->get_id(), false);
        // Now report is turned on. It will return true.
        $this->assertTrue($comment->can_report());
        // Check emails used for report correct.
        $emails = $this->commentarea->get_reporting_emails();
        foreach(explode(';', $inputreportemails) as $k => $v) {
            $this->assertEquals($v, $emails[$k]);
        }
    }
}
